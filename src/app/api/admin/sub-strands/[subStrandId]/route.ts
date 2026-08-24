import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { subStrands } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({ name: z.string().min(1).max(120).optional(), order: z.number().int().optional() });

export async function PATCH(req: Request, { params }: { params: Promise<{ subStrandId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { subStrandId } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [subStrand] = await db.update(subStrands).set(parsed.data).where(eq(subStrands.id, subStrandId)).returning();
  if (!subStrand) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ subStrand });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ subStrandId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { subStrandId } = await params;
  await db.delete(subStrands).where(eq(subStrands.id, subStrandId));
  return NextResponse.json({ ok: true });
}
