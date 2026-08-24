import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import {
  testAttempts, testQuestions, questions, questionOptions, testAnswers,
  topics, tests, topicProgress, subjectProgress,
  mistakes, profiles, achievements, userAchievements,
} from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({
  answers: z.array(z.object({ questionId: z.string().uuid(), chosenOptionId: z.string().uuid().nullable() })),
  timeTakenSeconds: z.number().int().nonnegative(),
});

// PATCH /api/tests/attempts/:attemptId — the ONLY place answers are graded.
// Every claim of "correct"/"score" in the product is computed here, from the
// database's isCorrect flags, never trusted from the client.
export async function PATCH(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const guard = await requireRole(["STUDENT"]);
  if ("error" in guard) return guard.error;
  const userId = guard.session.user.id;
  const { attemptId } = await params;

  const [attempt] = await db.select().from(testAttempts).where(eq(testAttempts.id, attemptId)).limit(1);
  if (!attempt || attempt.userId !== userId) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  if (attempt.submittedAt) return NextResponse.json({ error: "Attempt already submitted" }, { status: 409 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { answers, timeTakenSeconds } = parsed.data;

  const tqs = await db.select().from(testQuestions).where(eq(testQuestions.testId, attempt.testId));
  const questionIds = tqs.map((tq) => tq.questionId);
  const qRows = await db.select().from(questions).where(inArray(questions.id, questionIds));
  const optionRows = await db.select().from(questionOptions).where(inArray(questionOptions.questionId, questionIds));

  // Topic names for the by-topic breakdown.
  const topicIds = [...new Set(qRows.map((q) => q.topicId))];
  const topicRows = await db.select().from(topics).where(inArray(topics.id, topicIds));
  const topicNameById = Object.fromEntries(topicRows.map((t) => [t.id, t.name]));

  let correctCount = 0;
  const byTopic: Record<string, { correct: number; total: number }> = {};
  const missed: { questionId: string; topicId: string; chosenOptionId: string | null }[] = [];

  for (const q of qRows) {
    const topicName = topicNameById[q.topicId];
    byTopic[topicName] = byTopic[topicName] || { correct: 0, total: 0 };
    byTopic[topicName].total++;

    const answer = answers.find((a) => a.questionId === q.id);
    const correctOption = optionRows.find((o) => o.questionId === q.id && o.isCorrect);
    const isCorrect = !!answer?.chosenOptionId && answer.chosenOptionId === correctOption?.id;
    if (isCorrect) { correctCount++; byTopic[topicName].correct++; }
    else missed.push({ questionId: q.id, topicId: q.topicId, chosenOptionId: answer?.chosenOptionId ?? null });

    await db.insert(testAnswers).values({ attemptId, questionId: q.id, chosenOptionId: answer?.chosenOptionId ?? null, isCorrect });
  }

  const score = Math.round((correctCount / qRows.length) * 100);

  await db.update(testAttempts).set({
    submittedAt: new Date(), score, correctCount, totalCount: qRows.length, timeTakenSeconds,
  }).where(eq(testAttempts.id, attemptId));

  // Record mistakes (mirrors the prototype's Mistake Book).
  for (const m of missed) {
    const q = qRows.find((r) => r.id === m.questionId)!;
    await db.insert(mistakes).values({ userId, questionId: m.questionId, chosenOptionId: m.chosenOptionId, topicId: m.topicId });
  }

  // Update topic mastery from this attempt's per-topic accuracy.
  for (const [topicName, v] of Object.entries(byTopic)) {
    const topicId = topicRows.find((t) => t.name === topicName)!.id;
    const pct = Math.round((v.correct / v.total) * 100);
    const [existing] = await db.select().from(topicProgress).where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, topicId))).limit(1);
    if (existing) await db.update(topicProgress).set({ masteryPct: pct, attemptsCount: existing.attemptsCount + v.total, updatedAt: new Date() }).where(eq(topicProgress.id, existing.id));
    else await db.insert(topicProgress).values({ userId, topicId, masteryPct: pct, attemptsCount: v.total });
  }

  // Update subject mastery (average with previous, same rule as the prototype).
  const [testRow] = await db.select().from(tests).where(eq(tests.id, attempt.testId)).limit(1);
  const subjectId = testRow?.subjectId;
  if (subjectId) {
    const [existingSubj] = await db.select().from(subjectProgress).where(and(eq(subjectProgress.userId, userId), eq(subjectProgress.subjectId, subjectId))).limit(1);
    const nextMastery = existingSubj ? Math.round((existingSubj.masteryPct + score) / 2) : score;
    if (existingSubj) await db.update(subjectProgress).set({ masteryPct: nextMastery, updatedAt: new Date() }).where(eq(subjectProgress.id, existingSubj.id));
    else await db.insert(subjectProgress).values({ userId, subjectId, masteryPct: nextMastery });
  }

  // XP + achievements.
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const gainedXp = correctCount * 10 + (score >= 80 ? 50 : 0);
  if (profile) await db.update(profiles).set({ xp: profile.xp + gainedXp, lastActiveAt: new Date() }).where(eq(profiles.userId, userId));

  const priorAttempts = await db.select().from(testAttempts).where(and(eq(testAttempts.userId, userId), eq(testAttempts.testId, attempt.testId)));
  const priorScores = priorAttempts.filter((a) => a.id !== attemptId && a.score !== null).map((a) => a.score as number);
  const previousScore = priorScores.length ? priorScores[priorScores.length - 1] : null;
  const improvement = previousScore !== null ? score - previousScore : 0;

  const allQuestionsAnswered = await db.select().from(mistakes).where(eq(mistakes.userId, userId));
  const catalog = await db.select().from(achievements);
  const unlocked = await db.select().from(userAchievements).where(eq(userAchievements.userId, userId));
  const unlockedCodes = new Set(unlocked.map((u) => u.achievementId));

  const toUnlock: string[] = [];
  const findCode = (code: string) => catalog.find((c) => c.code === code);
  if (score === 100) { const a = findCode("perfect"); if (a && !unlockedCodes.has(a.id)) toUnlock.push(a.id); }
  if (score === 100) { const a = findCode("first100"); if (a && !unlockedCodes.has(a.id)) toUnlock.push(a.id); }
  if (improvement >= 25) { const a = findCode("bigimprove"); if (a && !unlockedCodes.has(a.id)) toUnlock.push(a.id); }
  for (const achievementId of toUnlock) await db.insert(userAchievements).values({ userId, achievementId }).onConflictDoNothing();

  return NextResponse.json({
    score, correct: correctCount, total: qRows.length, timeTaken: formatTime(timeTakenSeconds),
    byTopic, previousScore, improvement: previousScore !== null ? improvement : null,
    xpAwarded: gainedXp, achievementsUnlocked: toUnlock.length,
  });
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
