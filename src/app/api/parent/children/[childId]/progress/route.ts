import { NextResponse } from "next/server";
import { db } from "@/db";
import { parentChildren, profiles, grades, subjectProgress, subjects, topicProgress, testAttempts, tests } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// GET — a linked child's aggregate progress. Deliberately excludes
// `mistakes`/`testAnswers` (question/chosen-answer detail) — read-only,
// aggregate-only, matching the spec's "no raw answer-level data" instruction.
export async function GET(_req: Request, { params }: { params: Promise<{ childId: string }> }) {
  const guard = await requireRole(["PARENT", "ADMIN"]);
  if ("error" in guard) return guard.error;
  const { childId } = await params;

  if (guard.session.user.role !== "ADMIN") {
    const [link] = await db.select().from(parentChildren)
      .where(and(eq(parentChildren.parentId, guard.session.user.id), eq(parentChildren.childId, childId))).limit(1);
    if (!link) return NextResponse.json({ error: "Not your child" }, { status: 403 });
  }

  const [profile] = await db.select({ profile: profiles, gradeName: grades.name }).from(profiles)
    .leftJoin(grades, eq(grades.id, profiles.gradeId)).where(eq(profiles.userId, childId)).limit(1);

  const subjectRows = await db.select({ progress: subjectProgress, subjectName: subjects.name })
    .from(subjectProgress).innerJoin(subjects, eq(subjects.id, subjectProgress.subjectId)).where(eq(subjectProgress.userId, childId));

  const topicRows = await db.select({ progress: topicProgress }).from(topicProgress).where(eq(topicProgress.userId, childId));

  const attempts = await db.select({ attempt: testAttempts, testTitle: tests.title }).from(testAttempts)
    .innerJoin(tests, eq(tests.id, testAttempts.testId))
    .where(eq(testAttempts.userId, childId)).orderBy(desc(testAttempts.startedAt)).limit(5);

  const subjectMastery = Object.fromEntries(subjectRows.map((r) => [r.subjectName, r.progress.masteryPct]));
  const strongSubjects = subjectRows.filter((r) => r.progress.masteryPct >= 70).map((r) => r.subjectName);
  const weakSubjects = subjectRows.filter((r) => r.progress.masteryPct < 60).map((r) => r.subjectName);
  const completedTopicsCount = topicRows.filter((r) => r.progress.masteryPct >= 70).length;

  return NextResponse.json({
    name: profile?.profile.name ?? null,
    gradeName: profile?.gradeName ?? null,
    xp: profile?.profile.xp ?? 0,
    streak: profile?.profile.streak ?? 1,
    subjectMastery, strongSubjects, weakSubjects, completedTopicsCount,
    recentTests: attempts.filter((a) => a.attempt.submittedAt).map((a) => ({ title: a.testTitle, score: a.attempt.score, date: a.attempt.submittedAt })),
  });
}
