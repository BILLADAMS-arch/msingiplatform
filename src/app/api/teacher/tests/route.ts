import { NextResponse } from "next/server";
import { db } from "@/db";
import { tests, subjects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// GET /api/teacher/tests — every published test across all subjects, for the
// assignment-creation picker (a teacher can assign any published test, not
// just ones in their own class's subject).
export async function GET() {
  const guard = await requireRole(["TEACHER", "ADMIN"]);
  if ("error" in guard) return guard.error;

  const rows = await db.select({ id: tests.id, title: tests.title, subjectName: subjects.name })
    .from(tests).innerJoin(subjects, eq(subjects.id, tests.subjectId)).where(eq(tests.published, true));

  return NextResponse.json({ tests: rows });
}
