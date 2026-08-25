import { db } from "@/db";
import { profiles, achievements, userAchievements } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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

export async function awardXp(userId: string, amount: number): Promise<void> {
  const [profile] = await db.select({ xp: profiles.xp }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!profile) return;
  await db.update(profiles).set({ xp: profile.xp + amount }).where(eq(profiles.userId, userId));
}

/** Increments the running answered/correct counters, returns the new totals. */
export async function recordQuestionAnswered(userId: string, isCorrect: boolean): Promise<{ answered: number; correct: number }> {
  const [profile] = await db.select({ questionsAnswered: profiles.questionsAnswered, questionsCorrect: profiles.questionsCorrect })
    .from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const answered = (profile?.questionsAnswered ?? 0) + 1;
  const correct = (profile?.questionsCorrect ?? 0) + (isCorrect ? 1 : 0);
  await db.update(profiles).set({ questionsAnswered: answered, questionsCorrect: correct }).where(eq(profiles.userId, userId));
  return { answered, correct };
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
