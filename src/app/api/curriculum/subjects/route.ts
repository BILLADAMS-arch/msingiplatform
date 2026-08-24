import { NextResponse } from "next/server";
import { db } from "@/db";
import { subjects, grades } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/curriculum/subjects?grade=Grade%207
export async function GET(req: Request) {
  const gradeName = new URL(req.url).searchParams.get("grade");
  if (!gradeName) return NextResponse.json({ error: "grade query param is required" }, { status: 400 });

  const [grade] = await db.select().from(grades).where(eq(grades.name, gradeName)).limit(1);
  if (!grade) return NextResponse.json({ error: `Unknown grade: ${gradeName}` }, { status: 404 });

  const rows = await db.select().from(subjects).where(eq(subjects.gradeId, grade.id));
  return NextResponse.json({ grade: grade.name, subjects: rows });
}
