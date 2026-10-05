import { NextResponse } from "next/server";
import { db } from "@/db";
import { flashcards, flashcardProgress, topics } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// GET /api/flashcards?topicId=<uuid> — the topic's flashcard deck, each
// annotated with the signed-in student's own review status.
export async function GET(req: Request) {
  const guard = await requireRole(["STUDENT", "TEACHER", "PARENT", "ADMIN"]);
  if ("error" in guard) return guard.error;
  const userId = guard.session.user.id;

  const params = new URL(req.url).searchParams;
  const topicId = params.get("topicId");
  const topicName = params.get("topic"); // deprecated: names can repeat across grades
  if (!topicId && !topicName) return NextResponse.json({ error: "topicId query param is required" }, { status: 400 });
  if (topicId && !/^[0-9a-f-]{36}$/i.test(topicId)) return NextResponse.json({ error: "Invalid topicId" }, { status: 400 });

  const [topic] = await db.select().from(topics).where(topicId ? eq(topics.id, topicId) : eq(topics.name, topicName!)).limit(1);
  if (!topic) return NextResponse.json({ error: `Unknown topic: ${topicId ?? topicName}` }, { status: 404 });

  const cards = await db.select().from(flashcards).where(eq(flashcards.topicId, topic.id)).orderBy(asc(flashcards.order));
  const progress = await db.select().from(flashcardProgress).where(eq(flashcardProgress.userId, userId));
  const statusByCard = Object.fromEntries(progress.map((p) => [p.flashcardId, p.status]));

  return NextResponse.json({
    topic: topic.name, topicId: topic.id,
    cards: cards.map((c) => ({ id: c.id, front: c.front, back: c.back, status: statusByCard[c.id] ?? "new" })),
  });
}
