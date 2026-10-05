import { NextResponse } from "next/server";
import { db } from "@/db";
import { grades, subjects } from "@/db/schema";
import { asc, eq, sql } from "drizzle-orm";

// Public: the grade list (registration, curriculum explorer). Identity is the
// grade id; `code` is the stable official code (e.g. "G7"); `name` is display only.
// `hasSubjects` lets sign-up offer only grades that have content.
export async function GET() {
  const rows = await db.select({
    id: grades.id, code: grades.code, name: grades.name, group: grades.group, order: grades.order,
    subjectCount: sql<number>`count(${subjects.id})::int`,
  }).from(grades).leftJoin(subjects, eq(subjects.gradeId, grades.id))
    .groupBy(grades.id).orderBy(asc(grades.order));

  // Deprecated shape, kept for existing callers: group label -> grade names.
  const grouped: Record<string, string[]> = {};
  for (const r of rows) (grouped[r.group] ??= []).push(r.name);

  return NextResponse.json({
    grades: rows.map((r) => ({ id: r.id, code: r.code, name: r.name, group: r.group, hasSubjects: r.subjectCount > 0 })),
    groups: grouped,
  });
}
