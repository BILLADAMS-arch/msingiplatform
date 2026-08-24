import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { topics } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({
  subStrandId: z.string().uuid(),
  name: z.string().min(1).max(120),
  order: z.number().int().default(0),
  prerequisiteTopicId: z.string().uuid().optional(),
});

export async function GET(req: Request) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const subStrandId = new URL(req.url).searchParams.get("subStrandId");
  if (!subStrandId) return NextResponse.json({ error: "subStrandId query param is required" }, { status: 400 });
  const rows = await db.select().from(topics).where(eq(topics.subStrandId, subStrandId)).orderBy(asc(topics.order));
  return NextResponse.json({ topics: rows });
}

export async function POST(req: Request) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [topic] = await db.insert(topics).values(parsed.data).returning();
  return NextResponse.json({ topic }, { status: 201 });
}
