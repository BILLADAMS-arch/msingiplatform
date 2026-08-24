import { NextResponse } from "next/server";
import { db } from "@/db";
import { classMembers, users, profiles, subjectProgress, topicProgress, topics, testAttempts } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { requireOwnedClass } from "@/lib/teacher-guard";

// GET — class performance: average mastery, most-difficult topics, and
// students flagged as improving / needing support.
export async function GET(_req: Request, { params }: { params: Promise<{ classId: string }> }) {
  const guard = await requireRole(["TEACHER", "ADMIN"]);
  if ("error" in guard) return guard.error;
  const { classId } = await params;

  const owned = await requireOwnedClass(classId, guard.session.user.id, guard.session.user.role);
  if ("error" in owned) return owned.error;

  const members = await db.select({ id: users.id, name: profiles.name }).from(classMembers)
    .innerJoin(users, eq(users.id, classMembers.userId)).leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(classMembers.classId, classId));
  const memberIds = members.map((m) => m.id);

  if (memberIds.length === 0) {
    return NextResponse.json({ classAverage: 0, difficultTopics: [], improving: [], needingSupport: [] });
  }

  const allSubjectProgress = await db.select().from(subjectProgress).where(inArray(subjectProgress.userId, memberIds));
  const allTopicProgress = await db.select().from(topicProgress).where(inArray(topicProgress.userId, memberIds));
  const allAttempts = await db.select().from(testAttempts).where(inArray(testAttempts.userId, memberIds));

  const overallMasteryByUser = new Map<string, number>();
  for (const m of members) {
    const rows = allSubjectProgress.filter((p) => p.userId === m.id);
    overallMasteryByUser.set(m.id, rows.length ? Math.round(rows.reduce((a, r) => a + r.masteryPct, 0) / rows.length) : 0);
  }
  const classAverage = Math.round([...overallMasteryByUser.values()].reduce((a, b) => a + b, 0) / members.length);

  const topicIds = [...new Set(allTopicProgress.map((p) => p.topicId))];
  const topicRows = topicIds.length ? await db.select().from(topics).where(inArray(topics.id, topicIds)) : [];
  const difficultTopics = topicRows.map((t) => {
    const rows = allTopicProgress.filter((p) => p.topicId === t.id);
    const avg = Math.round(rows.reduce((a, r) => a + r.masteryPct, 0) / rows.length);
    return { name: t.name, avgMastery: avg, students: rows.length };
  }).sort((a, b) => a.avgMastery - b.avgMastery).slice(0, 5);

  const improving: { id: string; name: string | null }[] = [];
  const needingSupport: { id: string; name: string | null }[] = [];
  for (const m of members) {
    const submitted = allAttempts.filter((a) => a.userId === m.id && a.submittedAt && a.score !== null)
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
    if (submitted.length >= 2 && (submitted[submitted.length - 1].score as number) > (submitted[0].score as number)) {
      improving.push({ id: m.id, name: m.name });
    }
    if ((overallMasteryByUser.get(m.id) ?? 0) < 60) needingSupport.push({ id: m.id, name: m.name });
  }

  return NextResponse.json({ classAverage, difficultTopics, improving, needingSupport });
}
