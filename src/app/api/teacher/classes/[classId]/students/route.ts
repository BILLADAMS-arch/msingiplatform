import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { classMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { requireOwnedClass } from "@/lib/teacher-guard";

const bodySchema = z.object({ email: z.string().email() });

// POST — adds an existing STUDENT account to the class roster by email.
export async function POST(req: Request, { params }: { params: Promise<{ classId: string }> }) {
  const guard = await requireRole(["TEACHER", "ADMIN"]);
  if ("error" in guard) return guard.error;
  const { classId } = await params;

  const owned = await requireOwnedClass(classId, guard.session.user.id, guard.session.user.role);
  if ("error" in owned) return owned.error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [student] = await db.select().from(users).where(eq(users.email, parsed.data.email.toLowerCase())).limit(1);
  if (!student || student.role !== "STUDENT") return NextResponse.json({ error: "No student account with that email." }, { status: 404 });

  await db.insert(classMembers).values({ classId, userId: student.id }).onConflictDoNothing();
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ classId: string }> }) {
  const guard = await requireRole(["TEACHER", "ADMIN"]);
  if ("error" in guard) return guard.error;
  const { classId } = await params;

  const owned = await requireOwnedClass(classId, guard.session.user.id, guard.session.user.role);
  if ("error" in owned) return owned.error;

  const studentId = new URL(req.url).searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId query param is required" }, { status: 400 });

  await db.delete(classMembers).where(and(eq(classMembers.classId, classId), eq(classMembers.userId, studentId)));
  return NextResponse.json({ ok: true });
}
