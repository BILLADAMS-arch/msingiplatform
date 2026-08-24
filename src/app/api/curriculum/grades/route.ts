import { NextResponse } from "next/server";
import { db } from "@/db";
import { grades } from "@/db/schema";
import { asc } from "drizzle-orm";

// Public: powers the CBC curriculum explorer (grade groups -> grades).
export async function GET() {
  const rows = await db.select().from(grades).orderBy(asc(grades.order));
  const grouped: Record<string, string[]> = {};
  for (const r of rows) {
    grouped[r.group] = grouped[r.group] || [];
    grouped[r.group].push(r.name);
  }
  return NextResponse.json({ groups: grouped });
}
