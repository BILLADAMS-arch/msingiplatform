import { NextResponse } from "next/server";
import { db } from "@/db";
import { tests, subjects } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/tests?subjectId=... — list published tests for a subject.
export async function GET(req: Request) {
  const subjectId = new URL(req.url).searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ error: "subjectId query param is required" }, { status: 400 });
  const rows = await db.select().from(tests).where(eq(tests.subjectId, subjectId));
  return NextResponse.json({ tests: rows.filter((t) => t.published) });
}
