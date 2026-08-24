import { NextResponse } from "next/server";
import { db } from "@/db";
import { playgroundActivities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// GET /api/playground — the enabled catalog, for the student-facing grid.
export async function GET() {
  const guard = await requireRole(["STUDENT", "TEACHER", "PARENT", "ADMIN"]);
  if ("error" in guard) return guard.error;

  const rows = await db.select().from(playgroundActivities).where(eq(playgroundActivities.enabled, true));
  return NextResponse.json({
    activities: rows.map((r) => ({ id: r.id, area: r.area, title: r.title, description: r.description, slug: r.slug })),
  });
}
