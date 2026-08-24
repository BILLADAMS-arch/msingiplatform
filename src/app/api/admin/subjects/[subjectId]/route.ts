import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { subjects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({ name: z.string().min(1).max(80).optional(), description: z.string().optional() });

export async function PATCH(req: Request, { params }: { params: Promise<{ subjectId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { subjectId } = await params;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [subject] = await db.update(subjects).set(parsed.data).where(eq(subjects.id, subjectId)).returning();
  if (!subject) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ subject });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ subjectId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { subjectId } = await params;
  await db.delete(subjects).where(eq(subjects.id, subjectId));
  return NextResponse.json({ ok: true });
}
