import { NextResponse } from "next/server";
import { db } from "@/db";
import { tests, testQuestions, topics, questions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// GET /api/tests/:testId — public metadata shown before starting an attempt
// (title, timing, topics covered, question count) — never includes answers.
export async function GET(_req: Request, { params }: { params: Promise<{ testId: string }> }) {
  const guard = await requireRole(["STUDENT", "TEACHER", "PARENT", "ADMIN"]);
  if ("error" in guard) return guard.error;
  const { testId } = await params;

  const [test] = await db.select().from(tests).where(eq(tests.id, testId)).limit(1);
  if (!test || !test.published) return NextResponse.json({ error: "Test not found" }, { status: 404 });

  const tqs = await db.select().from(testQuestions).where(eq(testQuestions.testId, testId));
  const questionIds = tqs.map((tq) => tq.questionId);
  const topicIds = questionIds.length
    ? [...new Set((await db.select({ topicId: questions.topicId }).from(questions).where(inArray(questions.id, questionIds))).map((q) => q.topicId))]
    : [];
  const topicRows = topicIds.length ? await db.select({ name: topics.name }).from(topics).where(inArray(topics.id, topicIds)) : [];

  return NextResponse.json({
    id: test.id, title: test.title, type: test.type, passingThreshold: test.passingThreshold,
    timeLimitSeconds: test.timeLimitSeconds, questionCount: tqs.length, topics: topicRows.map((t) => t.name),
  });
}
