import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import {
  testAttempts, testQuestions, questions, questionOptions, testAnswers,
  topics, tests, subjects, topicProgress, subjectProgress, mistakes,
} from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { awardXp, touchStreak, unlockAchievement, recordQuestionAnswered } from "@/lib/gamification";

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
  let unlockedCount = 0;
  for (const [topicName, v] of Object.entries(byTopic)) {
    const topicId = topicRows.find((t) => t.name === topicName)!.id;
    const pct = Math.round((v.correct / v.total) * 100);
    const [existing] = await db.select().from(topicProgress).where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, topicId))).limit(1);
    if (existing) await db.update(topicProgress).set({ masteryPct: pct, attemptsCount: existing.attemptsCount + v.total, updatedAt: new Date() }).where(eq(topicProgress.id, existing.id));
    else await db.insert(topicProgress).values({ userId, topicId, masteryPct: pct, attemptsCount: v.total });
    if (pct >= 90 && await unlockAchievement(userId, "topicmaster")) unlockedCount++;
  }

  // Update subject mastery (average with previous, same rule as the prototype).
  const [testRow] = await db.select().from(tests).where(eq(tests.id, attempt.testId)).limit(1);
  const subjectId = testRow?.subjectId;
  if (subjectId) {
    const [existingSubj] = await db.select().from(subjectProgress).where(and(eq(subjectProgress.userId, userId), eq(subjectProgress.subjectId, subjectId))).limit(1);
    const nextMastery = existingSubj ? Math.round((existingSubj.masteryPct + score) / 2) : score;
    if (existingSubj) await db.update(subjectProgress).set({ masteryPct: nextMastery, updatedAt: new Date() }).where(eq(subjectProgress.id, existingSubj.id));
    else await db.insert(subjectProgress).values({ userId, subjectId, masteryPct: nextMastery });

    const [subjectRow] = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
    if (subjectRow?.name === "Mathematics" && nextMastery >= 80 && await unlockAchievement(userId, "mathmaster")) unlockedCount++;
  }

  // XP, streak and running question counters.
  const gainedXp = correctCount * 10 + (score >= 80 ? 50 : 0);
  await awardXp(userId, gainedXp);
  const streak = await touchStreak(userId);
  if (streak >= 7 && await unlockAchievement(userId, "streak7")) unlockedCount++;

  let questionsAnswered = 0;
  for (const q of qRows) {
    const isCorrect = !missed.some((m) => m.questionId === q.id);
    ({ answered: questionsAnswered } = await recordQuestionAnswered(userId, isCorrect));
  }
  if (questionsAnswered >= 100 && await unlockAchievement(userId, "q100")) unlockedCount++;

  const priorAttempts = await db.select().from(testAttempts).where(and(eq(testAttempts.userId, userId), eq(testAttempts.testId, attempt.testId)));
  const priorScores = priorAttempts.filter((a) => a.id !== attemptId && a.score !== null).map((a) => a.score as number);
  const previousScore = priorScores.length ? priorScores[priorScores.length - 1] : null;
  const improvement = previousScore !== null ? score - previousScore : 0;

  if (score === 100 && await unlockAchievement(userId, "perfect")) unlockedCount++;
  if (score === 100 && await unlockAchievement(userId, "first100")) unlockedCount++;
  if (improvement >= 25 && await unlockAchievement(userId, "bigimprove")) unlockedCount++;

  return NextResponse.json({
    score, correct: correctCount, total: qRows.length, timeTaken: formatTime(timeTakenSeconds),
    byTopic, previousScore, improvement: previousScore !== null ? improvement : null,
    xpAwarded: gainedXp, achievementsUnlocked: unlockedCount,
  });
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
