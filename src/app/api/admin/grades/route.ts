import { NextResponse } from "next/server";
import { db } from "@/db";
import { grades } from "@/db/schema";
import { asc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// GET /api/admin/grades — read-only. Grades are a fixed CBC structure
// (PP1–Grade 12); admins pick from this list rather than editing it.
export async function GET() {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const rows = await db.select().from(grades).orderBy(asc(grades.order));
  return NextResponse.json({ grades: rows });
}
