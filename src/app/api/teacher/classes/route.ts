import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { classes, classMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({ name: z.string().min(1).max(120) });

// GET /api/teacher/classes — this teacher's own classes, with roster size.
export async function GET() {
  const guard = await requireRole(["TEACHER", "ADMIN"]);
  if ("error" in guard) return guard.error;

  const rows = await db.select().from(classes).where(eq(classes.teacherId, guard.session.user.id));
  const withCounts = await Promise.all(rows.map(async (c) => {
    const members = await db.select().from(classMembers).where(eq(classMembers.classId, c.id));
    return { id: c.id, name: c.name, studentCount: members.length };
  }));

  return NextResponse.json({ classes: withCounts });
}

export async function POST(req: Request) {
  const guard = await requireRole(["TEACHER", "ADMIN"]);
  if ("error" in guard) return guard.error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [created] = await db.insert(classes).values({ name: parsed.data.name, teacherId: guard.session.user.id }).returning();
  return NextResponse.json({ class: created }, { status: 201 });
}
