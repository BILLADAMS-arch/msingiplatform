import { NextResponse } from "next/server";
import { db } from "@/db";
import { topics, subStrands, strands, subjects, grades } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// GET /api/admin/topics-flat — every topic with a full breadcrumb path, for
// the topic-picker dropdowns used by the Lessons/Questions/Resources editors
// (those need "which topic" without walking the curriculum tree by hand).
export async function GET() {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;

  const rows = await db.select({
    id: topics.id, name: topics.name, subjectId: subjects.id, subjectName: subjects.name, gradeName: grades.name,
  })
    .from(topics)
    .innerJoin(subStrands, eq(subStrands.id, topics.subStrandId))
    .innerJoin(strands, eq(strands.id, subStrands.strandId))
    .innerJoin(subjects, eq(subjects.id, strands.subjectId))
    .innerJoin(grades, eq(grades.id, subjects.gradeId))
    .orderBy(asc(grades.order), asc(subjects.name), asc(topics.order));

  return NextResponse.json({
    topics: rows.map((r) => ({ id: r.id, subjectId: r.subjectId, path: `${r.gradeName} › ${r.subjectName} › ${r.name}` })),
  });
}
