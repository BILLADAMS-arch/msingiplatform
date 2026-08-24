import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { classes, classMembers, users, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { requireOwnedClass } from "@/lib/teacher-guard";

const bodySchema = z.object({ name: z.string().min(1).max(120) });

// GET — class detail + roster (name/email per student).
export async function GET(_req: Request, { params }: { params: Promise<{ classId: string }> }) {
  const guard = await requireRole(["TEACHER", "ADMIN"]);
  if ("error" in guard) return guard.error;
  const { classId } = await params;

  const owned = await requireOwnedClass(classId, guard.session.user.id, guard.session.user.role);
  if ("error" in owned) return owned.error;

  const roster = await db.select({ id: users.id, email: users.email, name: profiles.name })
    .from(classMembers).innerJoin(users, eq(users.id, classMembers.userId))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(classMembers.classId, classId));

  return NextResponse.json({ class: owned.classRow, roster });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ classId: string }> }) {
  const guard = await requireRole(["TEACHER", "ADMIN"]);
  if ("error" in guard) return guard.error;
  const { classId } = await params;

  const owned = await requireOwnedClass(classId, guard.session.user.id, guard.session.user.role);
  if ("error" in owned) return owned.error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await db.update(classes).set({ name: parsed.data.name }).where(eq(classes.id, classId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ classId: string }> }) {
  const guard = await requireRole(["TEACHER", "ADMIN"]);
  if ("error" in guard) return guard.error;
  const { classId } = await params;

  const owned = await requireOwnedClass(classId, guard.session.user.id, guard.session.user.role);
  if ("error" in owned) return owned.error;

  await db.delete(classes).where(eq(classes.id, classId));
  return NextResponse.json({ ok: true });
}
