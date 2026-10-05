import { NextResponse } from "next/server";
import { db } from "@/db";
import { profiles, topicProgress, subjectProgress, topics, subjects, subStrands, strands, lessons, testAttempts, tests, userAchievements, achievements, mistakes } from "@/db/schema";
import { eq, desc, and, inArray, isNull, count } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

export async function GET() {
  const guard = await requireRole(["STUDENT"]);
  if ("error" in guard) return guard.error;
  const userId = guard.session.user.id;

  // Independent reads run in parallel (they were sequential round trips to
  // the remote database). Results are identical to the previous version.
  const [
    [profile], topicRows, subjectRows, attempts, unlockedAchievements, allAchievements, [{ openMistakeCount }],
  ] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
    // Joined up to the subject so the Progress page can group topics and link
    // by topic id. Every link in this chain is a NOT NULL FK, so the row set is
    // the same as joining topics alone.
    db.select({ progress: topicProgress, topic: topics, subjectId: subjects.id, subjectName: subjects.name }).from(topicProgress)
      .innerJoin(topics, eq(topicProgress.topicId, topics.id))
      .innerJoin(subStrands, eq(topics.subStrandId, subStrands.id))
      .innerJoin(strands, eq(subStrands.strandId, strands.id))
      .innerJoin(subjects, eq(strands.subjectId, subjects.id))
      .where(eq(topicProgress.userId, userId)),
    db.select({ progress: subjectProgress, subject: subjects }).from(subjectProgress)
      .innerJoin(subjects, eq(subjectProgress.subjectId, subjects.id)).where(eq(subjectProgress.userId, userId)),
    db.select({ attempt: testAttempts, test: tests }).from(testAttempts)
      .innerJoin(tests, eq(testAttempts.testId, tests.id))
      .where(eq(testAttempts.userId, userId)).orderBy(desc(testAttempts.startedAt)),
    db.select({ code: achievements.code, label: achievements.label, icon: achievements.icon })
      .from(userAchievements).innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(eq(userAchievements.userId, userId)),
    db.select().from(achievements),
    // Count open mistakes in SQL instead of loading every row to count them.
    db.select({ openMistakeCount: count() }).from(mistakes).where(and(eq(mistakes.userId, userId), isNull(mistakes.masteredAt))),
  ]);

  const topicIds = topicRows.map((r) => r.topic.id);
  const lessonRows = topicIds.length
    ? await db.select({ id: lessons.id, topicId: lessons.topicId }).from(lessons).where(and(inArray(lessons.topicId, topicIds), eq(lessons.published, true)))
    : [];
  const lessonByTopic = new Map<string, string>();
  for (const l of lessonRows) if (!lessonByTopic.has(l.topicId)) lessonByTopic.set(l.topicId, l.id);

  return NextResponse.json({
    profile: profile ? { name: profile.name, xp: profile.xp, streak: profile.streak, goal: profile.goal, leaderboardOptOut: profile.leaderboardOptOut } : null,
    // Deprecated name-keyed maps (kept for older clients; names can repeat).
    // Use `topics` and `subjects`, which are keyed by id.
    topicMastery: Object.fromEntries(topicRows.map((r) => [r.topic.name, r.progress.masteryPct])),
    topics: topicRows.map((r) => ({
      id: r.topic.id, name: r.topic.name, masteryPct: r.progress.masteryPct,
      subjectId: r.subjectId, subjectName: r.subjectName, lessonId: lessonByTopic.get(r.topic.id) ?? null,
    })),
    subjectMastery: Object.fromEntries(subjectRows.map((r) => [r.subject.name, r.progress.masteryPct])),
    subjects: subjectRows.map((r) => ({ id: r.subject.id, code: r.subject.code, name: r.subject.name, masteryPct: r.progress.masteryPct })),
    testHistory: attempts.filter((a) => a.attempt.submittedAt).map((a) => ({
      date: a.attempt.submittedAt, score: a.attempt.score, testTitle: a.test.title,
      testId: a.test.id, passingThreshold: a.test.passingThreshold,
      correct: a.attempt.correctCount, total: a.attempt.totalCount,
    })),
    achievements: { unlocked: unlockedAchievements, all: allAchievements.map((a) => ({ code: a.code, label: a.label, icon: a.icon })) },
    openMistakeCount,
  });
}
