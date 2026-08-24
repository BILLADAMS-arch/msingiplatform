import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { strands } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({ name: z.string().min(1).max(120).optional(), order: z.number().int().optional() });

export async function PATCH(req: Request, { params }: { params: Promise<{ strandId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { strandId } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [strand] = await db.update(strands).set(parsed.data).where(eq(strands.id, strandId)).returning();
  if (!strand) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ strand });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ strandId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { strandId } = await params;
  await db.delete(strands).where(eq(strands.id, strandId));
  return NextResponse.json({ ok: true });
}
