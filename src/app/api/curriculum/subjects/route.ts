import { NextResponse } from "next/server";
import { db } from "@/db";
import { subjects, grades } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/curriculum/subjects?gradeId=<uuid>
// (?grade=<name> is still accepted for older clients; prefer gradeId.)
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const gradeId = params.get("gradeId");
  const gradeName = params.get("grade");
  if (!gradeId && !gradeName) return NextResponse.json({ error: "gradeId query param is required" }, { status: 400 });
  if (gradeId && !/^[0-9a-f-]{36}$/i.test(gradeId)) return NextResponse.json({ error: "Invalid gradeId" }, { status: 400 });

  const [grade] = await db.select().from(grades).where(gradeId ? eq(grades.id, gradeId) : eq(grades.name, gradeName!)).limit(1);
  if (!grade) return NextResponse.json({ error: `Unknown grade: ${gradeId ?? gradeName}` }, { status: 404 });

  const rows = await db.select().from(subjects).where(eq(subjects.gradeId, grade.id));
  return NextResponse.json({ grade: grade.name, gradeId: grade.id, gradeCode: grade.code, subjects: rows });
}
