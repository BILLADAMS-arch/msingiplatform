import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { questions, questionOptions, mistakes, profiles, topicProgress } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({ questionId: z.string().uuid(), chosenOptionId: z.string().uuid() });

// POST — grades a single practice answer server-side (the client never has
// access to the correct option ahead of time) and updates XP/mastery/mistakes.
export async function POST(req: Request) {
  const guard = await requireRole(["STUDENT"]);
  if ("error" in guard) return guard.error;
  const userId = guard.session.user.id;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { questionId, chosenOptionId } = parsed.data;

  const [question] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const options = await db.select().from(questionOptions).where(eq(questionOptions.questionId, questionId));
  const chosen = options.find((o) => o.id === chosenOptionId);
  const correctOption = options.find((o) => o.isCorrect);
  const isCorrect = !!chosen?.isCorrect;

  if (!isCorrect) {
    await db.insert(mistakes).values({ userId, questionId, chosenOptionId, topicId: question.topicId });
  }

  const [existingProgress] = await db.select().from(topicProgress)
    .where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, question.topicId))).limit(1);
  const nextMastery = clamp((existingProgress?.masteryPct ?? 0) + (isCorrect ? 6 : -3), 0, 100);
  if (existingProgress) {
    await db.update(topicProgress).set({ masteryPct: nextMastery, attemptsCount: existingProgress.attemptsCount + 1, updatedAt: new Date() }).where(eq(topicProgress.id, existingProgress.id));
  } else {
    await db.insert(topicProgress).values({ userId, topicId: question.topicId, masteryPct: clamp(nextMastery, 0, 100), attemptsCount: 1 });
  }

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (profile) await db.update(profiles).set({ xp: profile.xp + (isCorrect ? 10 : 2), lastActiveAt: new Date() }).where(eq(profiles.userId, userId));

  return NextResponse.json({
    isCorrect,
    correctOptionId: correctOption?.id,
    explanation: question.explanation,
  });
}

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }
