import { NextResponse } from "next/server";
import { db } from "@/db";
import { lessons, topics, resources, flashcards, tests } from "@/db/schema";
import { and, eq, ilike } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// GET /api/search?q=fractions — searches lessons, topics, resources,
// flashcards, and tests by title/name. Deliberately excludes `questions` —
// searching question text would let students search up test/practice
// content, including hints toward answers.
export async function GET(req: Request) {
  const guard = await requireRole(["STUDENT", "TEACHER", "PARENT", "ADMIN"]);
  if ("error" in guard) return guard.error;

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ lessons: [], topics: [], resources: [], flashcards: [], tests: [] });
  const pattern = `%${q}%`;

  const [lessonRows, topicRows, resourceRows, flashcardRows, testRows] = await Promise.all([
    db.select().from(lessons).where(and(ilike(lessons.title, pattern), eq(lessons.published, true))).limit(8),
    db.select().from(topics).where(ilike(topics.name, pattern)).limit(8),
    db.select().from(resources).where(and(ilike(resources.title, pattern), eq(resources.published, true))).limit(8),
    db.select({ flashcard: flashcards, topicId: flashcards.topicId }).from(flashcards).where(ilike(flashcards.front, pattern)).limit(8),
    db.select().from(tests).where(and(ilike(tests.title, pattern), eq(tests.published, true))).limit(8),
  ]);

  const topicNameById = new Map<string, string>();
  if (flashcardRows.length) {
    const relatedTopics = await db.select().from(topics);
    for (const t of relatedTopics) topicNameById.set(t.id, t.name);
  }

  return NextResponse.json({
    lessons: lessonRows.map((l) => ({ id: l.id, title: l.title })),
    topics: topicRows.map((t) => ({ id: t.id, name: t.name })),
    resources: resourceRows.map((r) => ({ id: r.id, title: r.title, type: r.type })),
    flashcards: flashcardRows.map((f) => ({ topicName: topicNameById.get(f.topicId) ?? "", front: f.flashcard.front })),
    tests: testRows.map((t) => ({ id: t.id, title: t.title })),
  });
}
