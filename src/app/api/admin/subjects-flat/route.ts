import { NextResponse } from "next/server";
import { db } from "@/db";
import { subjects, grades } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// GET /api/admin/subjects-flat — every subject with its grade, for the
// subject-picker dropdown used by the Tests editor.
export async function GET() {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;

  const rows = await db.select({ id: subjects.id, name: subjects.name, gradeId: grades.id, gradeName: grades.name })
    .from(subjects)
    .innerJoin(grades, eq(grades.id, subjects.gradeId))
    .orderBy(asc(grades.order), asc(subjects.name));

  return NextResponse.json({ subjects: rows.map((r) => ({ id: r.id, gradeId: r.gradeId, path: `${r.gradeName} › ${r.name}` })) });
}
