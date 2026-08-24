import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { subStrands } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({ strandId: z.string().uuid(), name: z.string().min(1).max(120), order: z.number().int().default(0) });

export async function GET(req: Request) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const strandId = new URL(req.url).searchParams.get("strandId");
  if (!strandId) return NextResponse.json({ error: "strandId query param is required" }, { status: 400 });
  const rows = await db.select().from(subStrands).where(eq(subStrands.strandId, strandId)).orderBy(asc(subStrands.order));
  return NextResponse.json({ subStrands: rows });
}

export async function POST(req: Request) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [subStrand] = await db.insert(subStrands).values(parsed.data).returning();
  return NextResponse.json({ subStrand }, { status: 201 });
}
