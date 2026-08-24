import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, lessons, questions, tests, resources, topics, topicProgress, subjects, subjectProgress } from "@/db/schema";
import { requireRole } from "@/lib/api-guard";

// GET /api/admin/stats — dashboard/analytics numbers. Aggregated in JS rather
// than SQL aggregates — data volumes here are CMS-scale, not warehouse-scale,
// and this keeps the query straightforward.
export async function GET() {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;

  const [allUsers, allTopics, allTopicProgress, allSubjects, allSubjectProgress] = await Promise.all([
    db.select({ role: users.role }).from(users),
    db.select({ id: topics.id, name: topics.name }).from(topics),
    db.select({ topicId: topicProgress.topicId, masteryPct: topicProgress.masteryPct }).from(topicProgress),
    db.select({ id: subjects.id, name: subjects.name }).from(subjects),
    db.select({ subjectId: subjectProgress.subjectId, userId: subjectProgress.userId }).from(subjectProgress),
  ]);

  const [allLessons, allQuestions, allTests, allResources] = await Promise.all([
    db.select({ id: lessons.id }).from(lessons),
    db.select({ id: questions.id }).from(questions),
    db.select({ id: tests.id }).from(tests),
    db.select({ id: resources.id }).from(resources),
  ]);

  const userCounts = { STUDENT: 0, TEACHER: 0, PARENT: 0, ADMIN: 0 };
  for (const u of allUsers) userCounts[u.role]++;

  const difficultTopics = allTopics
    .map((t) => {
      const rows = allTopicProgress.filter((p) => p.topicId === t.id);
      if (!rows.length) return null;
      const avg = Math.round(rows.reduce((a, r) => a + r.masteryPct, 0) / rows.length);
      return { name: t.name, avgMastery: avg, students: rows.length };
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)
    .sort((a, b) => a.avgMastery - b.avgMastery)
    .slice(0, 10);

  const popularSubjects = allSubjects
    .map((s) => {
      const rows = allSubjectProgress.filter((p) => p.subjectId === s.id);
      const students = new Set(rows.map((r) => r.userId)).size;
      return { name: s.name, students };
    })
    .filter((s) => s.students > 0)
    .sort((a, b) => b.students - a.students)
    .slice(0, 10);

  return NextResponse.json({
    userCounts,
    contentCounts: { lessons: allLessons.length, questions: allQuestions.length, tests: allTests.length, resources: allResources.length },
    difficultTopics,
    popularSubjects,
  });
}
