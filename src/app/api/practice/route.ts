import { NextResponse } from "next/server";
import { db } from "@/db";
import { topics, questions, questionOptions, topicProgress } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

type Difficulty = "easy" | "medium" | "hard";

// Adaptive weighting: bias which difficulty tier shows up more often based on
// the learner's current mastery of this topic — not a full IRT-style engine,
// just a real, honest nudge toward "more of what they need right now."
function weightsForMastery(mastery: number): Record<Difficulty, number> {
  if (mastery < 40) return { easy: 3, medium: 2, hard: 1 };
  if (mastery < 75) return { easy: 1, medium: 3, hard: 2 };
  return { easy: 1, medium: 2, hard: 3 };
}

// GET /api/practice?topic=Fractions&count=10
// Returns questions WITHOUT which option/answer is correct — that's only
// revealed after the student answers, via POST below.
export async function GET(req: Request) {
  const guard = await requireRole(["STUDENT"]);
  if ("error" in guard) return guard.error;
  const userId = guard.session.user.id;

  const url = new URL(req.url);
  const topicName = url.searchParams.get("topic");
  const count = Math.min(20, Number(url.searchParams.get("count") ?? 10));
  if (!topicName) return NextResponse.json({ error: "topic query param is required" }, { status: 400 });

  const [topic] = await db.select().from(topics).where(eq(topics.name, topicName)).limit(1);
  if (!topic) return NextResponse.json({ error: `Unknown topic: ${topicName}` }, { status: 404 });

  const pool = await db.select().from(questions).where(eq(questions.topicId, topic.id));
  if (pool.length === 0) return NextResponse.json({ questions: [] });

  const [progress] = await db.select().from(topicProgress)
    .where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, topic.id))).limit(1);
  const weights = weightsForMastery(progress?.masteryPct ?? 0);

  const weighted = pool.flatMap((q) => Array(weights[q.difficulty] ?? 1).fill(q));
  const shuffled = [...weighted].sort(() => Math.random() - 0.5);
  const seen = new Set<string>();
  const ordered: typeof pool = [];
  for (const q of shuffled) { if (!seen.has(q.id)) { seen.add(q.id); ordered.push(q); } }
  const picked = Array.from({ length: count }, (_, i) => ordered[i % ordered.length]);

  const questionIds = picked.map((q) => q.id);
  const options = await db.select().from(questionOptions).where(inArray(questionOptions.questionId, questionIds));

  const result = picked.map((q, i) => ({
    // Give repeated picks unique client-side keys.
    attemptKey: `${q.id}-${i}`,
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    difficulty: q.difficulty,
    options: options.filter((o) => o.questionId === q.id).sort((a, b) => a.order - b.order).map((o) => ({ id: o.id, label: o.label })),
  }));

  return NextResponse.json({ topic: topic.name, questions: result });
}
