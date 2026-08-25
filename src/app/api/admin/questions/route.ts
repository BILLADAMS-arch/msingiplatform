import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { questions, questionOptions, topics } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({
  topicId: z.string().uuid(),
  type: z.enum(["multiple_choice", "true_false", "short_answer", "numerical"]),
  prompt: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  explanation: z.string().min(1),
  learningObjective: z.string().optional(),
  options: z.array(z.object({ label: z.string().min(1), isCorrect: z.boolean() })).optional(),
  answerText: z.string().optional(),
  answerNumeric: z.coerce.number().optional(),
  answerTolerance: z.coerce.number().optional(),
});

// GET /api/admin/questions?topicId=... — filterable list for the question bank.
export async function GET(req: Request) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;

  const topicId = new URL(req.url).searchParams.get("topicId");
  const rows = await db.select({ question: questions, topicName: topics.name })
    .from(questions)
    .innerJoin(topics, eq(topics.id, questions.topicId))
    .where(topicId ? eq(questions.topicId, topicId) : undefined)
    .orderBy(desc(questions.id));

  return NextResponse.json({
    questions: rows.map((r) => ({ id: r.question.id, prompt: r.question.prompt, difficulty: r.question.difficulty, type: r.question.type, topicName: r.topicName })),
  });
}

export async function POST(req: Request) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { options, ...rest } = parsed.data;

  const usesOptions = rest.type === "multiple_choice" || rest.type === "true_false";
  if (usesOptions && (!options || options.length < 2)) return NextResponse.json({ error: "At least 2 options are required." }, { status: 400 });
  if (rest.type === "short_answer" && !rest.answerText?.trim()) return NextResponse.json({ error: "An accepted answer is required." }, { status: 400 });
  if (rest.type === "numerical" && rest.answerNumeric === undefined) return NextResponse.json({ error: "A correct numeric value is required." }, { status: 400 });

  const [question] = await db.insert(questions).values(rest).returning();
  if (usesOptions && options) {
    for (let i = 0; i < options.length; i++) {
      await db.insert(questionOptions).values({ questionId: question.id, label: options[i].label, isCorrect: options[i].isCorrect, order: i });
    }
  }
  return NextResponse.json({ question }, { status: 201 });
}
