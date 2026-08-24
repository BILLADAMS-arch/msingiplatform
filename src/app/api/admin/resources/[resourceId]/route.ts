import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({ title: z.string().min(1).max(160).optional(), published: z.boolean().optional() });

export async function PATCH(req: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { resourceId } = await params;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await db.update(resources).set(parsed.data).where(eq(resources.id, resourceId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { resourceId } = await params;
  await db.delete(resources).where(eq(resources.id, resourceId));
  return NextResponse.json({ ok: true });
}
