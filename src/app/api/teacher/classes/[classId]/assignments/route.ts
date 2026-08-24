import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { assignments, tests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { requireOwnedClass } from "@/lib/teacher-guard";

const bodySchema = z.object({ testId: z.string().uuid(), dueAt: z.string().datetime().optional() });

// GET — assignments for this class, with the test's title.
export async function GET(_req: Request, { params }: { params: Promise<{ classId: string }> }) {
  const guard = await requireRole(["TEACHER", "ADMIN"]);
  if ("error" in guard) return guard.error;
  const { classId } = await params;

  const owned = await requireOwnedClass(classId, guard.session.user.id, guard.session.user.role);
  if ("error" in owned) return owned.error;

  const rows = await db.select({ assignment: assignments, testTitle: tests.title })
    .from(assignments).innerJoin(tests, eq(tests.id, assignments.testId)).where(eq(assignments.classId, classId));

  return NextResponse.json({
    assignments: rows.map((r) => ({ id: r.assignment.id, testId: r.assignment.testId, testTitle: r.testTitle, dueAt: r.assignment.dueAt, createdAt: r.assignment.createdAt })),
  });
}

// POST — assigns an already-published test to the class.
export async function POST(req: Request, { params }: { params: Promise<{ classId: string }> }) {
  const guard = await requireRole(["TEACHER", "ADMIN"]);
  if ("error" in guard) return guard.error;
  const { classId } = await params;

  const owned = await requireOwnedClass(classId, guard.session.user.id, guard.session.user.role);
  if ("error" in owned) return owned.error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [test] = await db.select().from(tests).where(eq(tests.id, parsed.data.testId)).limit(1);
  if (!test || !test.published) return NextResponse.json({ error: "Test not found or not published" }, { status: 404 });

  const [created] = await db.insert(assignments).values({
    classId, testId: parsed.data.testId, dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : undefined,
  }).returning();
  return NextResponse.json({ assignment: created }, { status: 201 });
}
