import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { strands } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({ subjectId: z.string().uuid(), name: z.string().min(1).max(120), order: z.number().int().default(0) });

export async function GET(req: Request) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const subjectId = new URL(req.url).searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ error: "subjectId query param is required" }, { status: 400 });
  const rows = await db.select().from(strands).where(eq(strands.subjectId, subjectId)).orderBy(asc(strands.order));
  return NextResponse.json({ strands: rows });
}

export async function POST(req: Request) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const [strand] = await db.insert(strands).values(parsed.data).returning();
  return NextResponse.json({ strand }, { status: 201 });
}
