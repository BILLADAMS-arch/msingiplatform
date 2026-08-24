import { NextResponse } from "next/server";
import { db } from "@/db";
import { tests, testQuestions, questions, questionOptions, testAttempts } from "@/db/schema";
import { eq, inArray, asc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// POST /api/tests/:testId/attempts — starts a timed attempt and returns the
// question set WITHOUT correct answers. Answers are only graded on submit
// (PATCH /api/tests/attempts/:attemptId), server-side.
export async function POST(_req: Request, { params }: { params: Promise<{ testId: string }> }) {
  const guard = await requireRole(["STUDENT"]);
  if ("error" in guard) return guard.error;
  const { testId } = await params;

  const [test] = await db.select().from(tests).where(eq(tests.id, testId)).limit(1);
  if (!test || !test.published) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  const tqs = await db.select().from(testQuestions).where(eq(testQuestions.testId, testId)).orderBy(asc(testQuestions.order));
  const questionIds = tqs.map((tq) => tq.questionId);
  const qRows = await db.select().from(questions).where(inArray(questions.id, questionIds));
  const options = await db.select().from(questionOptions).where(inArray(questionOptions.questionId, questionIds));

  const [attempt] = await db.insert(testAttempts).values({ testId, userId: guard.session.user.id }).returning();

  const orderedQuestions = tqs.map((tq) => {
    const q = qRows.find((r) => r.id === tq.questionId)!;
    return {
      id: q.id,
      prompt: q.prompt,
      topicId: q.topicId,
      options: options.filter((o) => o.questionId === q.id).sort((a, b) => a.order - b.order).map((o) => ({ id: o.id, label: o.label })),
    };
  });

  return NextResponse.json({
    attemptId: attempt.id,
    test: { id: test.id, title: test.title, timeLimitSeconds: test.timeLimitSeconds, passingThreshold: test.passingThreshold },
    questions: orderedQuestions,
  });
}
