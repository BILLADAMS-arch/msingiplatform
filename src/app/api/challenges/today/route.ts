import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyChallengeProgress } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// GET /api/challenges/today — fetches (or lazily creates) the signed-in
// student's progress on today's daily challenge: answer targetCount practice
// questions in a row without a mistake.
export async function GET() {
  const guard = await requireRole(["STUDENT"]);
  if ("error" in guard) return guard.error;
  const userId = guard.session.user.id;

  const today = new Date().toISOString().slice(0, 10);
  const [existing] = await db.select().from(dailyChallengeProgress)
    .where(and(eq(dailyChallengeProgress.userId, userId), eq(dailyChallengeProgress.date, today))).limit(1);

  if (existing) {
    return NextResponse.json({
      targetCount: existing.targetCount, correctStreak: existing.correctStreak, completed: existing.completed,
    });
  }

  const [created] = await db.insert(dailyChallengeProgress).values({ userId, date: today }).returning();
  return NextResponse.json({
    targetCount: created.targetCount, correctStreak: created.correctStreak, completed: created.completed,
  });
}
