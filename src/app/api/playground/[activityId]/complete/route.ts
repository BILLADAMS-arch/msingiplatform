import { NextResponse } from "next/server";
import { db } from "@/db";
import { playgroundActivityProgress } from "@/db/schema";
import { requireRole } from "@/lib/api-guard";
import { awardXp } from "@/lib/gamification";

const FIRST_USE_XP = 15;

// POST /api/playground/:activityId/complete — records the student's first
// genuine interaction with an activity and awards XP once (spec §29 lists
// Playground activities as an XP source).
export async function POST(_req: Request, { params }: { params: Promise<{ activityId: string }> }) {
  const guard = await requireRole(["STUDENT"]);
  if ("error" in guard) return guard.error;
  const userId = guard.session.user.id;
  const { activityId } = await params;

  const inserted = await db.insert(playgroundActivityProgress)
    .values({ userId, activityId })
    .onConflictDoNothing()
    .returning();

  if (inserted.length > 0) await awardXp(userId, FIRST_USE_XP);

  return NextResponse.json({ ok: true, xpAwarded: inserted.length > 0 ? FIRST_USE_XP : 0 });
}
