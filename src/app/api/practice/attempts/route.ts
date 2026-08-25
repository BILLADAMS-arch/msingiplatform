import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { questions, questionOptions, mistakes, topicProgress, dailyChallengeProgress } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { awardXp, touchStreak, unlockAchievement, recordQuestionAnswered } from "@/lib/gamification";
import { gradeAnswer } from "@/lib/grading";

const bodySchema = z.object({
  questionId: z.string().uuid(),
  chosenOptionId: z.string().uuid().optional(),
  answerText: z.string().max(200).optional(),
  answerNumeric: z.number().optional(),
});

// POST — grades a single practice answer server-side (the client never has
// access to the correct option ahead of time) and updates XP/mastery/mistakes.
export async function POST(req: Request) {
  const guard = await requireRole(["STUDENT"]);
  if ("error" in guard) return guard.error;
  const userId = guard.session.user.id;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { questionId, chosenOptionId, answerText, answerNumeric } = parsed.data;

  const [question] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const options = await db.select().from(questionOptions).where(eq(questionOptions.questionId, questionId));
  const { isCorrect, correctLabel } = gradeAnswer(question, options, { chosenOptionId, answerText, answerNumeric });

  if (!isCorrect) {
    await db.insert(mistakes).values({
      userId, questionId, topicId: question.topicId,
      chosenOptionId: chosenOptionId ?? null,
      chosenText: answerText ?? (answerNumeric !== undefined ? String(answerNumeric) : null),
    });
  }

  const [existingProgress] = await db.select().from(topicProgress)
    .where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, question.topicId))).limit(1);
  const nextMastery = clamp((existingProgress?.masteryPct ?? 0) + (isCorrect ? 6 : -3), 0, 100);
  if (existingProgress) {
    await db.update(topicProgress).set({ masteryPct: nextMastery, attemptsCount: existingProgress.attemptsCount + 1, updatedAt: new Date() }).where(eq(topicProgress.id, existingProgress.id));
  } else {
    await db.insert(topicProgress).values({ userId, topicId: question.topicId, masteryPct: clamp(nextMastery, 0, 100), attemptsCount: 1 });
  }
  if (nextMastery >= 90) await unlockAchievement(userId, "topicmaster");

  await awardXp(userId, isCorrect ? 10 : 2);
  const streak = await touchStreak(userId);
  if (streak >= 7) await unlockAchievement(userId, "streak7");

  const { answered } = await recordQuestionAnswered(userId, isCorrect);
  if (answered >= 100) await unlockAchievement(userId, "q100");

  await advanceDailyChallenge(userId, isCorrect);

  return NextResponse.json({
    isCorrect,
    correctOptionId: options.find((o) => o.isCorrect)?.id,
    correctLabel,
    explanation: question.explanation,
  });
}

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

/** Advances (or resets) today's "answer N in a row" daily challenge. Awards +100 XP once, on completion. */
async function advanceDailyChallenge(userId: string, isCorrect: boolean) {
  const today = new Date().toISOString().slice(0, 10);
  const [existing] = await db.select().from(dailyChallengeProgress)
    .where(and(eq(dailyChallengeProgress.userId, userId), eq(dailyChallengeProgress.date, today))).limit(1);

  if (!existing) {
    await db.insert(dailyChallengeProgress).values({ userId, date: today, correctStreak: isCorrect ? 1 : 0 });
    return;
  }
  if (existing.completed) return;

  const nextCorrectStreak = isCorrect ? existing.correctStreak + 1 : 0;
  const justCompleted = nextCorrectStreak >= existing.targetCount;
  await db.update(dailyChallengeProgress).set({
    correctStreak: nextCorrectStreak,
    completed: justCompleted,
    completedAt: justCompleted ? new Date() : null,
  }).where(eq(dailyChallengeProgress.id, existing.id));
  if (justCompleted) await awardXp(userId, 100);
}
