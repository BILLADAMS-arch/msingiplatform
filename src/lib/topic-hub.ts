import { MASTERED } from "@/lib/mastery";
import { practiceHref } from "@/lib/links";

/** Shape returned by GET /api/topics/:topicId (all values are real, stored learner data). */
export type TopicHubData = {
  topic: { id: string; name: string; position: number; total: number };
  breadcrumb: { grade: string; subjectId: string; subject: string; strand: string; subStrand: string };
  mastery: { pct: number; answered: number };
  lesson: { id: string; title: string; completed: boolean } | null;
  practice: { questionCount: number };
  flashcards: { count: number; reviewed: number; easy: number; difficult: number; reviewLater: number };
  mistakes: { open: number };
  tests: { id: string; title: string; passingThreshold: number; questionsOnTopic: number; latestScore: number | null }[];
  previous: { id: string; name: string } | null;
  next: { id: string; name: string } | null;
};

export type NextAction = {
  kind: "lesson" | "mistakes" | "practise" | "retest" | "flashcards" | "next-topic" | "done" | "none";
  label: string;
  reason: string;
  href: string | null;
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * The single most useful thing to do with this topic right now. Order:
 *   1. lesson not finished            → finish the lesson
 *   2. unresolved mistakes            → review them
 *   3. mastery below "Strong"         → practise
 *   4. Strong                         → retest (a test that covers the topic), else keep it fresh
 * Every branch only uses what the learner actually has; nothing is invented, and
 * a topic with nothing published says so instead of showing a button that goes nowhere.
 */
export function nextAction(d: TopicHubData): NextAction {
  const { lesson, mastery, mistakes, tests } = d;
  const hasQuestions = d.practice.questionCount > 0;
  const hasCards = d.flashcards.count > 0;

  if (!lesson && !hasQuestions && !hasCards) {
    return { kind: "none", label: "Coming soon", reason: "Nothing has been published for this topic yet.", href: null };
  }

  if (lesson && !lesson.completed) {
    const started = mastery.answered > 0;
    return {
      kind: "lesson",
      label: started ? "Continue lesson" : "Start lesson",
      reason: started ? "You've begun practising. Finish the lesson to fill any gaps." : "Start with the lesson, then practise to build mastery.",
      href: `/learn/lesson/${lesson.id}`,
    };
  }

  if (mistakes.open > 0) {
    return {
      kind: "mistakes",
      label: "Review your mistakes",
      reason: `${mistakes.open} ${plural(mistakes.open, "question", "questions")} you got wrong in ${d.topic.name} ${plural(mistakes.open, "is", "are")} waiting for you.`,
      href: `/mistakes?topicId=${d.topic.id}`,
    };
  }

  if (mastery.pct < MASTERED && hasQuestions) {
    return {
      kind: "practise",
      label: "Practise this topic",
      reason: mastery.answered === 0 && mastery.pct === 0 ? "You haven't practised this topic yet. Practice is what builds mastery." : `Your mastery is ${mastery.pct}%. Practice is what builds it.`,
      href: practiceHref({ id: d.topic.id, name: d.topic.name }),
    };
  }

  if (mastery.pct >= MASTERED && tests.length > 0) {
    // Prefer a test they haven't taken, then the one they scored lowest on.
    const t = [...tests].sort((a, b) => (a.latestScore ?? -1) - (b.latestScore ?? -1))[0];
    return {
      kind: "retest",
      label: "Retest yourself",
      reason: t.latestScore === null ? `You're at ${mastery.pct}%. Prove it with ${t.title}.` : `You're at ${mastery.pct}%. Your last score on ${t.title} was ${t.latestScore}%. Try to beat it.`,
      href: `/tests/${t.id}`,
    };
  }

  if (mastery.pct >= MASTERED && hasQuestions) {
    return { kind: "practise", label: "Practise again", reason: `You're at ${mastery.pct}% on this topic. A quick round keeps it sharp.`, href: practiceHref({ id: d.topic.id, name: d.topic.name }) };
  }

  if (hasCards && d.flashcards.reviewed < d.flashcards.count) {
    return { kind: "flashcards", label: "Review flashcards", reason: `${d.flashcards.count - d.flashcards.reviewed} of ${d.flashcards.count} cards haven't been reviewed yet.`, href: `/flashcards?topicId=${d.topic.id}` };
  }

  if (d.next) {
    return { kind: "next-topic", label: "Go to the next topic", reason: `You're up to date here. Next up: ${d.next.name}.`, href: `/learn/topic/${d.next.id}` };
  }

  return { kind: "done", label: "Back to your subject", reason: "You're up to date with this topic.", href: `/learn?subjectId=${d.breadcrumb.subjectId}` };
}
