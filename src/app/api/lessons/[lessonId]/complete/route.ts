import { NextResponse } from "next/server";
import { db } from "@/db";
import { lessons, topicProgress, lessonCompletions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { awardXp, touchStreak, unlockAchievement } from "@/lib/gamification";

const LESSON_XP = 30;

// POST — records that the signed-in student finished a lesson: awards XP and
// nudges topic mastery up slightly (real practice/tests move mastery further).
//
// Idempotent: XP is awarded only the FIRST time a learner completes a lesson.
// The insert into lesson_completions is the guard — its unique (user, lesson)
// constraint means only one request can ever create the row, even if two
// arrive at once. Finishing again still counts as activity for the streak
// and still applies the mastery floor.
export async function POST(_req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requireRole(["STUDENT"]);
  if ("error" in guard) return guard.error;
  const { lessonId } = await params;

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const userId = guard.session.user.id;

  const inserted = await db.insert(lessonCompletions).values({ userId, lessonId })
    .onConflictDoNothing({ target: [lessonCompletions.userId, lessonCompletions.lessonId] })
    .returning({ id: lessonCompletions.id });
  const firstCompletion = inserted.length > 0;

  // Unchanged rule, applied on every completion as before: finishing a lesson
  // brings the topic to at least 15% mastery (a floor, so repeats are harmless).
  const [existing] = await db.select().from(topicProgress)
    .where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, lesson.topicId))).limit(1);
  if (existing) {
    await db.update(topicProgress).set({ masteryPct: Math.max(existing.masteryPct, 15), updatedAt: new Date() }).where(eq(topicProgress.id, existing.id));
  } else {
    await db.insert(topicProgress).values({ userId, topicId: lesson.topicId, masteryPct: 15, attemptsCount: 0 }).onConflictDoNothing();
  }

  if (firstCompletion) await awardXp(userId, LESSON_XP);

  const streak = await touchStreak(userId);
  if (streak >= 7) await unlockAchievement(userId, "streak7");

  return NextResponse.json({ ok: true, xpAwarded: firstCompletion ? LESSON_XP : 0, alreadyCompleted: !firstCompletion });
}
