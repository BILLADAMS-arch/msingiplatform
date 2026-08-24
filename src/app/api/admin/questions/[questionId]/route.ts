import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { questions, questionOptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({
  topicId: z.string().uuid().optional(),
  type: z.enum(["multiple_choice", "true_false"]).optional(),
  prompt: z.string().min(1).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  explanation: z.string().min(1).optional(),
  learningObjective: z.string().optional(),
  options: z.array(z.object({ label: z.string().min(1), isCorrect: z.boolean() })).min(2).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { questionId } = await params;

  const [question] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const options = await db.select().from(questionOptions).where(eq(questionOptions.questionId, questionId));

  return NextResponse.json({ ...question, options: options.sort((a, b) => a.order - b.order).map((o) => ({ label: o.label, isCorrect: o.isCorrect })) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { questionId } = await params;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { options, ...rest } = parsed.data;

  if (Object.keys(rest).length) await db.update(questions).set(rest).where(eq(questions.id, questionId));

  if (options) {
    await db.delete(questionOptions).where(eq(questionOptions.questionId, questionId));
    for (let i = 0; i < options.length; i++) {
      await db.insert(questionOptions).values({ questionId, label: options[i].label, isCorrect: options[i].isCorrect, order: i });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { questionId } = await params;
  await db.delete(questions).where(eq(questions.id, questionId));
  return NextResponse.json({ ok: true });
}
