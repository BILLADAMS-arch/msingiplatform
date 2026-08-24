import { NextResponse } from "next/server";
import { db } from "@/db";
import { topics, questions, questionOptions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { sql } from "drizzle-orm";

// GET /api/practice?topic=Fractions&count=10
// Returns questions WITHOUT which option is correct — that's only revealed
// after the student answers, via POST below.
export async function GET(req: Request) {
  const guard = await requireRole(["STUDENT"]);
  if ("error" in guard) return guard.error;

  const url = new URL(req.url);
  const topicName = url.searchParams.get("topic");
  const count = Math.min(20, Number(url.searchParams.get("count") ?? 10));
  if (!topicName) return NextResponse.json({ error: "topic query param is required" }, { status: 400 });

  const [topic] = await db.select().from(topics).where(eq(topics.name, topicName)).limit(1);
  if (!topic) return NextResponse.json({ error: `Unknown topic: ${topicName}` }, { status: 404 });

  const pool = await db.select().from(questions).where(eq(questions.topicId, topic.id));
  if (pool.length === 0) return NextResponse.json({ questions: [] });

  // Sample with replacement up to `count`, shuffled server-side.
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked = Array.from({ length: count }, (_, i) => shuffled[i % shuffled.length]);

  const questionIds = picked.map((q) => q.id);
  const options = await db.select().from(questionOptions).where(inArray(questionOptions.questionId, questionIds));

  const result = picked.map((q, i) => ({
    // Give repeated picks unique client-side keys.
    attemptKey: `${q.id}-${i}`,
    id: q.id,
    prompt: q.prompt,
    difficulty: q.difficulty,
    options: options.filter((o) => o.questionId === q.id).sort((a, b) => a.order - b.order).map((o) => ({ id: o.id, label: o.label })),
  }));

  return NextResponse.json({ topic: topic.name, questions: result });
}
