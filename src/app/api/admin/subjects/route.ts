import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { subjects, grades } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({
  gradeId: z.string().uuid(),
  name: z.string().min(1).max(80),
  description: z.string().optional(),
});

// GET /api/admin/subjects?gradeId=... — used by the curriculum tree browser.
export async function GET(req: Request) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const gradeId = new URL(req.url).searchParams.get("gradeId");
  if (!gradeId) return NextResponse.json({ error: "gradeId query param is required" }, { status: 400 });
  const rows = await db.select().from(subjects).where(eq(subjects.gradeId, gradeId));
  return NextResponse.json({ subjects: rows });
}

export async function POST(req: Request) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [grade] = await db.select().from(grades).where(eq(grades.id, parsed.data.gradeId)).limit(1);
  if (!grade) return NextResponse.json({ error: "Unknown grade" }, { status: 400 });

  const [subject] = await db.insert(subjects).values(parsed.data).returning();
  return NextResponse.json({ subject }, { status: 201 });
}
