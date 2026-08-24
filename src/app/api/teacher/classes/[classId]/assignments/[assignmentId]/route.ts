import { NextResponse } from "next/server";
import { db } from "@/db";
import { assignments, classMembers, users, profiles, testAttempts, tests } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { requireOwnedClass } from "@/lib/teacher-guard";

// GET — per-student completion status for this assignment.
export async function GET(_req: Request, { params }: { params: Promise<{ classId: string; assignmentId: string }> }) {
  const guard = await requireRole(["TEACHER", "ADMIN"]);
  if ("error" in guard) return guard.error;
  const { classId, assignmentId } = await params;

  const owned = await requireOwnedClass(classId, guard.session.user.id, guard.session.user.role);
  if ("error" in owned) return owned.error;

  const [assignment] = await db.select().from(assignments).where(and(eq(assignments.id, assignmentId), eq(assignments.classId, classId))).limit(1);
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  const [test] = await db.select().from(tests).where(eq(tests.id, assignment.testId)).limit(1);

  const roster = await db.select({ id: users.id, name: profiles.name }).from(classMembers)
    .innerJoin(users, eq(users.id, classMembers.userId)).leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(classMembers.classId, classId));
  const rosterIds = roster.map((r) => r.id);

  const attempts = rosterIds.length
    ? await db.select().from(testAttempts).where(and(eq(testAttempts.testId, assignment.testId), inArray(testAttempts.userId, rosterIds)))
    : [];

  const completion = roster.map((r) => {
    const attempt = attempts.filter((a) => a.userId === r.id && a.submittedAt).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
    return { studentId: r.id, name: r.name, completed: !!attempt, score: attempt?.score ?? null };
  });

  return NextResponse.json({ testTitle: test?.title, dueAt: assignment.dueAt, completion });
}
