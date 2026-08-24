import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { playgroundActivities } from "@/db/schema";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({
  area: z.enum(["mathematics", "science", "computer", "language"]),
  title: z.string().min(1).max(120),
  description: z.string().min(1),
});

export async function GET() {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const rows = await db.select().from(playgroundActivities);
  return NextResponse.json({ activities: rows });
}

export async function POST(req: Request) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [activity] = await db.insert(playgroundActivities).values({ ...parsed.data, enabled: false }).returning();
  return NextResponse.json({ activity }, { status: 201 });
}
