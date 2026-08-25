import { NextResponse } from "next/server";
import { db } from "@/db";
import { mistakes, questions, questionOptions, topics } from "@/db/schema";
import { eq, and, isNull, inArray, desc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

export async function GET() {
  const guard = await requireRole(["STUDENT"]);
  if ("error" in guard) return guard.error;
  const userId = guard.session.user.id;

  const rows = await db.select({ mistake: mistakes, question: questions, topic: topics }).from(mistakes)
    .innerJoin(questions, eq(mistakes.questionId, questions.id))
    .innerJoin(topics, eq(mistakes.topicId, topics.id))
    .where(and(eq(mistakes.userId, userId), isNull(mistakes.masteredAt)))
    .orderBy(desc(mistakes.createdAt));

  const questionIds = rows.map((r) => r.question.id);
  const options = questionIds.length ? await db.select().from(questionOptions).where(inArray(questionOptions.questionId, questionIds)) : [];

  const result = rows.map((r) => {
    const opts = options.filter((o) => o.questionId === r.question.id);
    const usesOptions = r.question.type === "multiple_choice" || r.question.type === "true_false";
    return {
      id: r.mistake.id,
      question: r.question.prompt,
      topic: r.topic.name,
      chosen: usesOptions ? (opts.find((o) => o.id === r.mistake.chosenOptionId)?.label ?? "(no answer)") : (r.mistake.chosenText ?? "(no answer)"),
      correct: usesOptions ? opts.find((o) => o.isCorrect)?.label : (r.question.answerText?.split("|")[0] ?? r.question.answerNumeric?.toString()),
      explanation: r.question.explanation,
      date: r.mistake.createdAt,
    };
  });

  return NextResponse.json({ mistakes: result });
}
