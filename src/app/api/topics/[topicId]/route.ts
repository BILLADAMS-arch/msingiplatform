import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import {
  topics, subStrands, strands, subjects, grades, topicProgress, lessons, lessonCompletions, questions, flashcards, flashcardProgress,
  mistakes, tests, testQuestions, testAttempts,
} from "@/db/schema";
import { and, asc, count, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// GET /api/topics/:topicId — everything the Topic Hub needs about ONE topic for
// the signed-in learner, in a single read-only call: where it sits, mastery,
// lesson/practice/flashcard/mistake status, the tests that cover it and the
// learner's latest score on each, and the previous/next topic.
//
// Read-only. It only reads existing tables (no schema change) and computes
// nothing new: mastery is the stored topic_progress value, counts are counts.
export async function GET(_req: Request, { params }: { params: Promise<{ topicId: string }> }) {
  const guard = await requireRole(["STUDENT"]);
  if ("error" in guard) return guard.error;
  const userId = guard.session.user.id;

  const { topicId } = await params;
  if (!z.string().uuid().safeParse(topicId).success) return NextResponse.json({ error: "Invalid topic id." }, { status: 400 });

  const [place] = await db.select({
    id: topics.id, name: topics.name,
    subStrand: subStrands.name, strand: strands.name,
    subjectId: subjects.id, subject: subjects.name, grade: grades.name,
  }).from(topics)
    .innerJoin(subStrands, eq(subStrands.id, topics.subStrandId))
    .innerJoin(strands, eq(strands.id, subStrands.strandId))
    .innerJoin(subjects, eq(subjects.id, strands.subjectId))
    .innerJoin(grades, eq(grades.id, subjects.gradeId))
    .where(eq(topics.id, topicId)).limit(1);
  if (!place) return NextResponse.json({ error: "Topic not found." }, { status: 404 });

  const [siblings, [progress], lessonRows, [{ questionCount }], cardRows, [{ openMistakes }], coveringTests] = await Promise.all([
    db.select({ id: topics.id, name: topics.name }).from(topics)
      .innerJoin(subStrands, eq(subStrands.id, topics.subStrandId))
      .innerJoin(strands, eq(strands.id, subStrands.strandId))
      .where(eq(strands.subjectId, place.subjectId)).orderBy(asc(topics.order)),
    db.select({ masteryPct: topicProgress.masteryPct, attempts: topicProgress.attemptsCount }).from(topicProgress)
      .where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, topicId))).limit(1),
    db.select({ id: lessons.id, title: lessons.title, completedAt: lessonCompletions.completedAt }).from(lessons)
      .leftJoin(lessonCompletions, and(eq(lessonCompletions.lessonId, lessons.id), eq(lessonCompletions.userId, userId)))
      .where(and(eq(lessons.topicId, topicId), eq(lessons.published, true))),
    db.select({ questionCount: count() }).from(questions).where(eq(questions.topicId, topicId)),
    db.select({ cardId: flashcards.id, status: flashcardProgress.status }).from(flashcards)
      .leftJoin(flashcardProgress, and(eq(flashcardProgress.flashcardId, flashcards.id), eq(flashcardProgress.userId, userId)))
      .where(eq(flashcards.topicId, topicId)),
    db.select({ openMistakes: count() }).from(mistakes)
      .where(and(eq(mistakes.userId, userId), eq(mistakes.topicId, topicId), isNull(mistakes.masteredAt))),
    db.select({ id: tests.id, title: tests.title, passingThreshold: tests.passingThreshold, questionsOnTopic: count() }).from(testQuestions)
      .innerJoin(questions, eq(questions.id, testQuestions.questionId))
      .innerJoin(tests, eq(tests.id, testQuestions.testId))
      .where(and(eq(questions.topicId, topicId), eq(tests.published, true)))
      .groupBy(tests.id, tests.title, tests.passingThreshold),
  ]);

  // Latest submitted score per covering test (newest first, first one wins).
  const testIds = coveringTests.map((t) => t.id);
  const attempts = testIds.length
    ? await db.select({ testId: testAttempts.testId, score: testAttempts.score, submittedAt: testAttempts.submittedAt }).from(testAttempts)
      .where(and(eq(testAttempts.userId, userId), inArray(testAttempts.testId, testIds), isNotNull(testAttempts.submittedAt)))
      .orderBy(desc(testAttempts.submittedAt))
    : [];
  const latest = new Map<string, number | null>();
  for (const a of attempts) if (!latest.has(a.testId)) latest.set(a.testId, a.score);

  const index = siblings.findIndex((t) => t.id === topicId);
  const lesson = lessonRows[0] ?? null;
  const byStatus = (s: string) => cardRows.filter((c) => c.status === s).length;

  return NextResponse.json({
    topic: { id: place.id, name: place.name, position: index + 1, total: siblings.length },
    breadcrumb: { grade: place.grade, subjectId: place.subjectId, subject: place.subject, strand: place.strand, subStrand: place.subStrand },
    mastery: { pct: progress?.masteryPct ?? 0, answered: progress?.attempts ?? 0 },
    lesson: lesson ? { id: lesson.id, title: lesson.title, completed: !!lesson.completedAt } : null,
    practice: { questionCount },
    flashcards: { count: cardRows.length, reviewed: cardRows.filter((c) => c.status && c.status !== "new").length, easy: byStatus("easy"), difficult: byStatus("difficult"), reviewLater: byStatus("review_later") },
    mistakes: { open: openMistakes },
    tests: coveringTests.map((t) => ({ id: t.id, title: t.title, passingThreshold: t.passingThreshold, questionsOnTopic: t.questionsOnTopic, latestScore: latest.get(t.id) ?? null })),
    previous: index > 0 ? siblings[index - 1] : null,
    next: index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null,
  });
}
