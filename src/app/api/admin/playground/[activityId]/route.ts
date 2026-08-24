import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { playgroundActivities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({
  area: z.enum(["mathematics", "science", "computer", "language"]).optional(),
  title: z.string().min(1).max(120).optional(),
  description: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ activityId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { activityId } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  await db.update(playgroundActivities).set(parsed.data).where(eq(playgroundActivities.id, activityId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ activityId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { activityId } = await params;
  await db.delete(playgroundActivities).where(eq(playgroundActivities.id, activityId));
  return NextResponse.json({ ok: true });
}
