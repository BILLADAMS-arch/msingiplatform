import { NextResponse } from "next/server";
import { db } from "@/db";
import { lessons, profiles, topicProgress } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// POST — records that the signed-in student finished a lesson: awards XP and
// nudges topic mastery up slightly (real practice/tests move mastery further).
export async function POST(_req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requireRole(["STUDENT"]);
  if ("error" in guard) return guard.error;
  const { lessonId } = await params;

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const userId = guard.session.user.id;

  const [existing] = await db.select().from(topicProgress)
    .where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, lesson.topicId))).limit(1);

  if (existing) {
    await db.update(topicProgress).set({ masteryPct: Math.max(existing.masteryPct, 15), updatedAt: new Date() }).where(eq(topicProgress.id, existing.id));
  } else {
    await db.insert(topicProgress).values({ userId, topicId: lesson.topicId, masteryPct: 15, attemptsCount: 0 });
  }

  await db.update(profiles).set({ xp: (await currentXp(userId)) + 30, lastActiveAt: new Date() }).where(eq(profiles.userId, userId));

  return NextResponse.json({ ok: true, xpAwarded: 30 });
}

async function currentXp(userId: string) {
  const [p] = await db.select({ xp: profiles.xp }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return p?.xp ?? 0;
}
