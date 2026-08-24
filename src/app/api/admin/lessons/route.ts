import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { lessons, topics, subStrands, strands, subjects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({ topicId: z.string().uuid(), title: z.string().min(1).max(160) });

// GET /api/admin/lessons — every lesson (published or not), with enough
// curriculum context (topic/subject) to identify it in a flat list.
export async function GET() {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;

  const rows = await db.select({ lesson: lessons, topicName: topics.name, subjectName: subjects.name })
    .from(lessons)
    .innerJoin(topics, eq(topics.id, lessons.topicId))
    .innerJoin(subStrands, eq(subStrands.id, topics.subStrandId))
    .innerJoin(strands, eq(strands.id, subStrands.strandId))
    .innerJoin(subjects, eq(subjects.id, strands.subjectId))
    .orderBy(desc(lessons.id));

  return NextResponse.json({
    lessons: rows.map((r) => ({ id: r.lesson.id, title: r.lesson.title, published: r.lesson.published, topicName: r.topicName, subjectName: r.subjectName })),
  });
}

// POST — creates an empty lesson shell; sections/quick check are added on the edit screen.
export async function POST(req: Request) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [lesson] = await db.insert(lessons).values({ ...parsed.data, published: false }).returning();
  return NextResponse.json({ lesson }, { status: 201 });
}
