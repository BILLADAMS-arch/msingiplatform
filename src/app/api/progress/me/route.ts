import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles, topicProgress, subjectProgress, topics, subjects, testAttempts, tests, userAchievements, achievements, mistakes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

export async function GET() {
  const guard = await requireRole(["STUDENT"]);
  if ("error" in guard) return guard.error;
  const userId = guard.session.user.id;

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);

  const topicRows = await db.select({ progress: topicProgress, topic: topics }).from(topicProgress)
    .innerJoin(topics, eq(topicProgress.topicId, topics.id)).where(eq(topicProgress.userId, userId));

  const subjectRows = await db.select({ progress: subjectProgress, subject: subjects }).from(subjectProgress)
    .innerJoin(subjects, eq(subjectProgress.subjectId, subjects.id)).where(eq(subjectProgress.userId, userId));

  const attempts = await db.select({ attempt: testAttempts, test: tests }).from(testAttempts)
    .innerJoin(tests, eq(testAttempts.testId, tests.id))
    .where(eq(testAttempts.userId, userId)).orderBy(desc(testAttempts.startedAt));

  const unlockedAchievements = await db.select({ code: achievements.code, label: achievements.label, icon: achievements.icon })
    .from(userAchievements).innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(eq(userAchievements.userId, userId));

  const allAchievements = await db.select().from(achievements);

  const openMistakeCount = (await db.select().from(mistakes).where(eq(mistakes.userId, userId))).filter((m) => !m.masteredAt).length;

  return NextResponse.json({
    profile: profile ? { name: profile.name, xp: profile.xp, streak: profile.streak, goal: profile.goal } : null,
    topicMastery: Object.fromEntries(topicRows.map((r) => [r.topic.name, r.progress.masteryPct])),
    subjectMastery: Object.fromEntries(subjectRows.map((r) => [r.subject.name, r.progress.masteryPct])),
    testHistory: attempts.filter((a) => a.attempt.submittedAt).map((a) => ({
      date: a.attempt.submittedAt, score: a.attempt.score, testTitle: a.test.title,
    })),
    achievements: { unlocked: unlockedAchievements, all: allAchievements.map((a) => ({ code: a.code, label: a.label, icon: a.icon })) },
    openMistakeCount,
  });
}
