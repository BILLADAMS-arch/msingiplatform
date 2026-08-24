import { NextResponse } from "next/server";
import { db } from "@/db";
import { lessons, lessonSections, quickChecks, topics } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const [row] = await db.select({ lesson: lessons, topicName: topics.name })
    .from(lessons).innerJoin(topics, eq(topics.id, lessons.topicId)).where(eq(lessons.id, lessonId)).limit(1);
  if (!row || !row.lesson.published) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const sections = await db.select().from(lessonSections).where(eq(lessonSections.lessonId, lessonId)).orderBy(asc(lessonSections.order));
  const [quickCheck] = await db.select().from(quickChecks).where(eq(quickChecks.lessonId, lessonId)).limit(1);

  return NextResponse.json({
    id: row.lesson.id,
    title: row.lesson.title,
    topicName: row.topicName,
    sections: sections.map((s) => ({ kind: s.kind, heading: s.heading, body: s.body, note: s.note })),
    quickCheck: quickCheck ? { question: quickCheck.question, options: quickCheck.options, correctIndex: quickCheck.correctIndex, explanation: quickCheck.explanation } : null,
  });
}
