import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// GET /api/leaderboard — all-time XP ranking within the caller's own grade,
// respecting leaderboardOptOut. Display name only — no email, no per-question
// data. Not time-windowed (weekly/monthly needs XP-history tracking the
// schema doesn't have yet) — an honest all-time ranking instead.
export async function GET() {
  const guard = await requireRole(["STUDENT", "ADMIN"]);
  if ("error" in guard) return guard.error;
  const userId = guard.session.user.id;

  const [me] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!me?.gradeId) return NextResponse.json({ rows: [], myRank: null });

  const rows = await db.select({ userId: profiles.userId, name: profiles.name, xp: profiles.xp })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(and(eq(profiles.gradeId, me.gradeId), eq(profiles.leaderboardOptOut, false), eq(users.role, "STUDENT")))
    .orderBy(desc(profiles.xp))
    .limit(50);

  const ranked = rows.map((r, i) => ({ rank: i + 1, name: r.name, xp: r.xp, isMe: r.userId === userId }));
  const myRank = ranked.find((r) => r.isMe)?.rank ?? null;

  return NextResponse.json({ rows: ranked, myRank, optedOut: me.leaderboardOptOut });
}
