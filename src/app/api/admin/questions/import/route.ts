import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { questions, questionOptions } from "@/db/schema";
import { requireRole } from "@/lib/api-guard";

// Same shape as QUESTION_BANK entries in src/db/seed.ts, so content authored
// offline in that format can be pasted straight in.
const itemSchema = z.object({
  q: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  correct: z.number().int().min(0),
  difficulty: z.enum(["easy", "medium", "hard"]),
  explanation: z.string().min(1),
});
const bodySchema = z.object({ topicId: z.string().uuid(), items: z.array(itemSchema).min(1) });

export async function POST(req: Request) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { topicId, items } = parsed.data;

  let inserted = 0;
  for (const item of items) {
    if (item.correct >= item.options.length) continue;
    const [question] = await db.insert(questions).values({
      topicId, type: "multiple_choice", prompt: item.q, difficulty: item.difficulty, explanation: item.explanation,
    }).returning();
    for (let i = 0; i < item.options.length; i++) {
      await db.insert(questionOptions).values({ questionId: question.id, label: item.options[i], isCorrect: i === item.correct, order: i });
    }
    inserted++;
  }

  return NextResponse.json({ inserted }, { status: 201 });
}
