import { NextResponse } from "next/server";
import { db } from "@/db";
import { tests } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// GET /api/tests?subjectId=...          — published tests for one subject
// GET /api/tests?subjectIds=a,b,c       — the same for several subjects in one request
export async function GET(req: Request) {
  const guard = await requireRole(["STUDENT", "TEACHER", "PARENT", "ADMIN"]);
  if ("error" in guard) return guard.error;

  const url = new URL(req.url);
  const many = url.searchParams.get("subjectIds");
  const one = url.searchParams.get("subjectId");
  const ids = many ? many.split(",").filter(Boolean).slice(0, 50) : one ? [one] : [];
  if (ids.length === 0) return NextResponse.json({ error: "subjectId (or subjectIds) query param is required" }, { status: 400 });

  const rows = await db.select().from(tests).where(ids.length === 1 ? eq(tests.subjectId, ids[0]) : inArray(tests.subjectId, ids));
  return NextResponse.json({ tests: rows.filter((t) => t.published) });
}
