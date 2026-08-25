import type { questions, questionOptions } from "@/db/schema";

type Question = typeof questions.$inferSelect;
type Option = typeof questionOptions.$inferSelect;

export type Submission = { chosenOptionId?: string | null; answerText?: string | null; answerNumeric?: number | null };

function normalize(s: string) { return s.trim().toLowerCase(); }

/**
 * Grades one answer against a question, regardless of type. Multiple-choice/
 * true-false compare against `questionOptions`; short_answer/numerical
 * compare against `questions.answerText`/`answerNumeric` directly — those
 * types have no options rows at all.
 */
export function gradeAnswer(question: Question, options: Option[], submission: Submission): { isCorrect: boolean; correctLabel: string } {
  if (question.type === "short_answer") {
    const accepted = (question.answerText ?? "").split("|").map(normalize).filter(Boolean);
    const given = submission.answerText ? normalize(submission.answerText) : "";
    return { isCorrect: !!given && accepted.includes(given), correctLabel: (question.answerText ?? "").split("|")[0] ?? "" };
  }
  if (question.type === "numerical") {
    const target = question.answerNumeric ?? NaN;
    const tolerance = question.answerTolerance ?? 0;
    const given = submission.answerNumeric;
    const isCorrect = given !== null && given !== undefined && Math.abs(given - target) <= tolerance;
    return { isCorrect, correctLabel: String(target) };
  }
  // multiple_choice / true_false
  const chosen = options.find((o) => o.id === submission.chosenOptionId);
  const correctOption = options.find((o) => o.isCorrect);
  return { isCorrect: !!chosen?.isCorrect, correctLabel: correctOption?.label ?? "" };
}
