import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { topics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({ name: z.string().min(1).max(120).optional(), order: z.number().int().optional() });

export async function PATCH(req: Request, { params }: { params: Promise<{ topicId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { topicId } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [topic] = await db.update(topics).set(parsed.data).where(eq(topics.id, topicId)).returning();
  if (!topic) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ topic });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ topicId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { topicId } = await params;
  await db.delete(topics).where(eq(topics.id, topicId));
  return NextResponse.json({ ok: true });
}
