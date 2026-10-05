import { db } from "@/db";
import { profiles, achievements, userAchievements } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { notify } from "@/lib/notify";

function utcDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Advances the learner's streak based on calendar-day gaps between activity,
 * and stamps lastActiveAt. Same day → unchanged. Exactly one day since the
 * last activity → +1. Anything longer (or no prior activity) → reset to 1.
 */
export async function touchStreak(userId: string): Promise<number> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!profile) return 1;

  const now = new Date();
  const today = utcDateString(now);
  let nextStreak = profile.streak;

  if (!profile.lastActiveAt) {
    nextStreak = 1;
  } else {
    const lastDay = utcDateString(profile.lastActiveAt);
    if (lastDay === today) {
      nextStreak = profile.streak;
    } else {
      const dayGap = Math.round((new Date(today).getTime() - new Date(lastDay).getTime()) / 86_400_000);
      nextStreak = dayGap === 1 ? profile.streak + 1 : 1;
    }
  }

  await db.update(profiles).set({ streak: nextStreak, lastActiveAt: now }).where(eq(profiles.userId, userId));
  if (nextStreak > 0 && nextStreak % 7 === 0 && nextStreak !== profile.streak) {
    await notify(userId, "streak_milestone", { days: nextStreak });
  }
  return nextStreak;
}

// Both helpers below use a single atomic UPDATE (col = col + n) rather than a
// read-then-write pair: one round trip instead of two, and concurrent awards
// can't overwrite each other. Same values as before; a missing profile is
// still a no-op.
export async function awardXp(userId: string, amount: number): Promise<void> {
  await db.update(profiles).set({ xp: sql`${profiles.xp} + ${amount}` }).where(eq(profiles.userId, userId));
}

/** Increments the running answered/correct counters, returns the new totals. */
export async function recordQuestionAnswered(userId: string, isCorrect: boolean): Promise<{ answered: number; correct: number }> {
  const [row] = await db.update(profiles).set({
    questionsAnswered: sql`${profiles.questionsAnswered} + 1`,
    questionsCorrect: sql`${profiles.questionsCorrect} + ${isCorrect ? 1 : 0}`,
  }).where(eq(profiles.userId, userId)).returning({ answered: profiles.questionsAnswered, correct: profiles.questionsCorrect });
  return row ?? { answered: 1, correct: isCorrect ? 1 : 0 };
}

/** Adds several answered questions at once (one atomic update), returns the new totals. */
export async function recordQuestionsAnswered(userId: string, answered: number, correct: number): Promise<{ answered: number; correct: number }> {
  const [row] = await db.update(profiles).set({
    questionsAnswered: sql`${profiles.questionsAnswered} + ${answered}`,
    questionsCorrect: sql`${profiles.questionsCorrect} + ${correct}`,
  }).where(eq(profiles.userId, userId)).returning({ answered: profiles.questionsAnswered, correct: profiles.questionsCorrect });
  return row ?? { answered, correct };
}

/** Unlocks an achievement by code if not already unlocked. Returns whether it was newly unlocked. */
export async function unlockAchievement(userId: string, code: string): Promise<boolean> {
  const [achievement] = await db.select().from(achievements).where(eq(achievements.code, code)).limit(1);
  if (!achievement) return false;

  const [existing] = await db.select().from(userAchievements)
    .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievement.id))).limit(1);
  if (existing) return false;

  await db.insert(userAchievements).values({ userId, achievementId: achievement.id }).onConflictDoNothing();
  await notify(userId, "achievement", { code: achievement.code, label: achievement.label, icon: achievement.icon });
  return true;
}
