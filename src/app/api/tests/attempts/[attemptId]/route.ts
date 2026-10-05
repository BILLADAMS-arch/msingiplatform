import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import {
  testAttempts, testQuestions, questions, questionOptions, testAnswers,
  topics, tests, subjects, topicProgress, subjectProgress, mistakes,
} from "@/db/schema";
import { eq, inArray, and, isNull } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { awardXp, touchStreak, unlockAchievement, recordQuestionsAnswered } from "@/lib/gamification";
import { gradeAnswer } from "@/lib/grading";

const bodySchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    chosenOptionId: z.string().uuid().nullable().optional(),
    answerText: z.string().max(200).nullable().optional(),
    answerNumeric: z.number().nullable().optional(),
  })),
  timeTakenSeconds: z.number().int().nonnegative(),
});

// Submissions arriving this long after the time limit are refused. The grace
// covers request latency and the client's auto-submit at 0:00 — the server
// clock starts when the attempt row is created, slightly before the client's.
const TIME_LIMIT_GRACE_SECONDS = 60;

class AlreadySubmitted extends Error {}

// PATCH /api/tests/attempts/:attemptId — the ONLY place answers are graded.
// Every claim of "correct"/"score" in the product is computed here, from the
// database's isCorrect flags, never trusted from the client.
//
// Integrity:
// - Time: elapsed time is measured from the attempt's server-side startedAt.
//   A submission past timeLimitSeconds + grace is refused, and the recorded
//   time is the server's measurement (capped at the limit), not the client's.
// - Exactly once: the attempt is claimed with a conditional UPDATE
//   (… WHERE submitted_at IS NULL) inside a transaction together with the
//   answers, mistakes and mastery writes. Two simultaneous submissions can't
//   both win, and a failure part-way leaves nothing half-written.
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
  const { answers } = parsed.data; // timeTakenSeconds from the client is no longer trusted

  const [testRow] = await db.select().from(tests).where(eq(tests.id, attempt.testId)).limit(1);
  const limit = testRow?.timeLimitSeconds ?? null;
  const elapsedSeconds = Math.max(0, Math.round((Date.now() - attempt.startedAt.getTime()) / 1000));
  if (limit && elapsedSeconds > limit + TIME_LIMIT_GRACE_SECONDS) {
    return NextResponse.json({
      error: "time_limit_exceeded",
      message: "The time limit for this attempt had passed before your answers were received.",
    }, { status: 409 });
  }
  const timeTakenSeconds = limit ? Math.min(elapsedSeconds, limit) : elapsedSeconds;

  const tqs = await db.select().from(testQuestions).where(eq(testQuestions.testId, attempt.testId));
  const questionIds = tqs.map((tq) => tq.questionId);
  const qRows = await db.select().from(questions).where(inArray(questions.id, questionIds));
  const optionRows = await db.select().from(questionOptions).where(inArray(questionOptions.questionId, questionIds));

  // Topic names for the by-topic breakdown.
  const topicIds = [...new Set(qRows.map((q) => q.topicId))];
  const topicRows = await db.select().from(topics).where(inArray(topics.id, topicIds));
  const topicNameById = Object.fromEntries(topicRows.map((t) => [t.id, t.name]));

  // Grade in memory (same rules as before).
  let correctCount = 0;
  const byTopic: Record<string, { correct: number; total: number; topicId: string }> = {};
  const missed: { questionId: string; topicId: string; chosenOptionId: string | null; chosenText: string | null }[] = [];
  const answerRows: (typeof testAnswers.$inferInsert)[] = [];

  for (const q of qRows) {
    const topicName = topicNameById[q.topicId];
    byTopic[topicName] = byTopic[topicName] || { correct: 0, total: 0, topicId: q.topicId };
    byTopic[topicName].total++;

    const answer = answers.find((a) => a.questionId === q.id);
    const questionOptions = optionRows.filter((o) => o.questionId === q.id);
    const { isCorrect } = gradeAnswer(q, questionOptions, {
      chosenOptionId: answer?.chosenOptionId, answerText: answer?.answerText, answerNumeric: answer?.answerNumeric,
    });
    const chosenText = answer?.answerText ?? (answer?.answerNumeric !== undefined && answer?.answerNumeric !== null ? String(answer.answerNumeric) : null);
    if (isCorrect) { correctCount++; byTopic[topicName].correct++; }
    else missed.push({ questionId: q.id, topicId: q.topicId, chosenOptionId: answer?.chosenOptionId ?? null, chosenText });

    answerRows.push({ attemptId, questionId: q.id, chosenOptionId: answer?.chosenOptionId ?? null, chosenText, isCorrect });
  }

  const score = Math.round((correctCount / qRows.length) * 100);
  const subjectId = testRow?.subjectId;
  const topicPcts: { topicId: string; pct: number }[] = [];
  let nextSubjectMastery: number | null = null;

  try {
    await db.transaction(async (tx) => {
      // The claim: only the first submission finds submitted_at still NULL.
      // A concurrent second one waits on the row lock, then matches nothing.
      const claimed = await tx.update(testAttempts).set({
        submittedAt: new Date(), score, correctCount, totalCount: qRows.length, timeTakenSeconds,
      }).where(and(eq(testAttempts.id, attemptId), eq(testAttempts.userId, userId), isNull(testAttempts.submittedAt)))
        .returning({ id: testAttempts.id });
      if (claimed.length === 0) throw new AlreadySubmitted();

      if (answerRows.length) await tx.insert(testAnswers).values(answerRows);

      // Record mistakes (mirrors the prototype's Mistake Book).
      if (missed.length) {
        await tx.insert(mistakes).values(missed.map((m) => ({ userId, questionId: m.questionId, chosenOptionId: m.chosenOptionId, chosenText: m.chosenText, topicId: m.topicId })));
      }

      // Update topic mastery from this attempt's per-topic accuracy.
      for (const [topicName, v] of Object.entries(byTopic)) {
        const topicId = topicRows.find((t) => t.name === topicName)!.id;
        const pct = Math.round((v.correct / v.total) * 100);
        topicPcts.push({ topicId, pct });
        const [existing] = await tx.select().from(topicProgress).where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, topicId))).limit(1);
        if (existing) await tx.update(topicProgress).set({ masteryPct: pct, attemptsCount: existing.attemptsCount + v.total, updatedAt: new Date() }).where(eq(topicProgress.id, existing.id));
        else await tx.insert(topicProgress).values({ userId, topicId, masteryPct: pct, attemptsCount: v.total });
      }

      // Update subject mastery (average with previous, same rule as the prototype).
      if (subjectId) {
        const [existingSubj] = await tx.select().from(subjectProgress).where(and(eq(subjectProgress.userId, userId), eq(subjectProgress.subjectId, subjectId))).limit(1);
        nextSubjectMastery = existingSubj ? Math.round((existingSubj.masteryPct + score) / 2) : score;
        if (existingSubj) await tx.update(subjectProgress).set({ masteryPct: nextSubjectMastery, updatedAt: new Date() }).where(eq(subjectProgress.id, existingSubj.id));
        else await tx.insert(subjectProgress).values({ userId, subjectId, masteryPct: nextSubjectMastery });
      }
    });
  } catch (err) {
    if (err instanceof AlreadySubmitted) return NextResponse.json({ error: "Attempt already submitted" }, { status: 409 });
    throw err;
  }

  // Everything below runs only for the submission that won the claim, so XP,
  // streak, counters and achievements are applied exactly once.
  let unlockedCount = 0;
  for (const { pct } of topicPcts) {
    if (pct >= 90 && await unlockAchievement(userId, "topicmaster")) unlockedCount++;
  }
  if (subjectId && nextSubjectMastery !== null) {
    const [subjectRow] = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
    if (subjectRow?.name === "Mathematics" && nextSubjectMastery >= 80 && await unlockAchievement(userId, "mathmaster")) unlockedCount++;
  }

  // XP, streak and running question counters.
  const gainedXp = correctCount * 10 + (score >= 80 ? 50 : 0);
  await awardXp(userId, gainedXp);
  const streak = await touchStreak(userId);
  if (streak >= 7 && await unlockAchievement(userId, "streak7")) unlockedCount++;

  const { answered: questionsAnswered } = await recordQuestionsAnswered(userId, qRows.length, correctCount);
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
