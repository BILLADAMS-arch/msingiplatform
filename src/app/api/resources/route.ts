import { NextResponse } from "next/server";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// GET /api/resources?gradeId=...&subjectId=...&topicId=... — any signed-in
// user can browse the library, filtered down the curriculum tree.
export async function GET(req: Request) {
  const guard = await requireRole(["STUDENT", "TEACHER", "PARENT", "ADMIN"]);
  if ("error" in guard) return guard.error;

  const url = new URL(req.url);
  const gradeId = url.searchParams.get("gradeId");
  const subjectId = url.searchParams.get("subjectId");
  const topicId = url.searchParams.get("topicId");

  const conditions = [
    gradeId ? eq(resources.gradeId, gradeId) : undefined,
    subjectId ? eq(resources.subjectId, subjectId) : undefined,
    topicId ? eq(resources.topicId, topicId) : undefined,
  ].filter((c) => c !== undefined);

  const rows = await db.select().from(resources).where(conditions.length ? and(...conditions) : undefined);
  return NextResponse.json({ resources: rows });
}
