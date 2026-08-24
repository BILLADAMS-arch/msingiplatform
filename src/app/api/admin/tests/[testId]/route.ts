import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { tests, testQuestions, questions, topics } from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({
  title: z.string().min(1).max(160).optional(),
  type: z.enum(["quick", "standard", "revision", "full"]).optional(),
  passingThreshold: z.number().int().min(0).max(100).optional(),
  timeLimitSeconds: z.number().int().positive().nullable().optional(),
  published: z.boolean().optional(),
  questionIds: z.array(z.string().uuid()).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ testId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { testId } = await params;

  const [test] = await db.select().from(tests).where(eq(tests.id, testId)).limit(1);
  if (!test) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tqs = await db.select().from(testQuestions).where(eq(testQuestions.testId, testId)).orderBy(asc(testQuestions.order));
  const questionIds = tqs.map((tq) => tq.questionId);
  const qRows = questionIds.length
    ? await db.select({ question: questions, topicName: topics.name }).from(questions).innerJoin(topics, eq(topics.id, questions.topicId)).where(inArray(questions.id, questionIds))
    : [];
  const byId = Object.fromEntries(qRows.map((r) => [r.question.id, r]));

  return NextResponse.json({
    ...test,
    questions: tqs.map((tq) => ({ id: tq.questionId, prompt: byId[tq.questionId]?.question.prompt, topicName: byId[tq.questionId]?.topicName })),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ testId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { testId } = await params;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { questionIds, ...meta } = parsed.data;

  if (Object.keys(meta).length) await db.update(tests).set(meta).where(eq(tests.id, testId));

  if (questionIds) {
    await db.delete(testQuestions).where(eq(testQuestions.testId, testId));
    for (let i = 0; i < questionIds.length; i++) {
      await db.insert(testQuestions).values({ testId, questionId: questionIds[i], order: i });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ testId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { testId } = await params;
  await db.delete(tests).where(eq(tests.id, testId));
  return NextResponse.json({ ok: true });
}
