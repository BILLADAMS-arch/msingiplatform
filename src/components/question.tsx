"use client";
import { ReactNode } from "react";
import { CheckCircle2, XCircle, Circle, CircleDot } from "lucide-react";

export type AnswerOption = { id: string; label: string };

/**
 * A question's answer choices as a real radio group: native radio inputs give
 * arrow-key movement and "selected" announcements for free. After an answer
 * is checked, pass `reveal` to mark the correct option and the learner's
 * choice — each state has an icon and a text label, never colour alone.
 */
export function AnswerOptions({ name, legend, options, value, onChange, disabled = false, reveal, columns = 2 }: {
  name: string;
  legend: ReactNode;
  options: AnswerOption[];
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
  reveal?: { correctId?: string | null; chosenId?: string | null };
  columns?: 1 | 2;
}) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className={`grid gap-2.5 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
        {options.map((opt, i) => {
          const selected = value === opt.id;
          const isCorrect = !!reveal && reveal.correctId === opt.id;
          const isWrongChoice = !!reveal && reveal.chosenId === opt.id && !isCorrect;
          const state = isCorrect ? "correct" : isWrongChoice ? "wrong" : selected ? "selected" : "idle";
          const styles = {
            correct: "border-(--green) bg-(--green-soft)",
            wrong: "border-(--coral) bg-(--coral-soft)",
            selected: "border-(--primary) bg-(--primary-soft) ring-1 ring-(--primary)",
            idle: "border-(--slate) bg-white hover:border-(--primary)",
          }[state];
          const letter = String.fromCharCode(65 + i);
          return (
            <label key={opt.id}
              className={`relative flex items-center gap-3 min-h-14 rounded-xl border px-3.5 py-3 text-sm font-medium transition-colors
                has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-(--primary)
                ${disabled ? "cursor-default" : "cursor-pointer"} ${styles}`}>
              <input type="radio" name={name} value={opt.id} checked={selected} disabled={disabled}
                onChange={() => onChange(opt.id)} className="sr-only" />
              <span aria-hidden className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold
                ${state === "correct" ? "bg-(--green) text-white" : state === "wrong" ? "bg-(--coral) text-white" : state === "selected" ? "bg-(--primary) text-white" : "bg-(--stone-2) text-(--ink-soft)"}`}>
                {letter}
              </span>
              <span className="flex-1">{opt.label}</span>
              <span aria-hidden className="shrink-0">
                {state === "correct" ? <CheckCircle2 size={18} className="text-(--green)" />
                  : state === "wrong" ? <XCircle size={18} className="text-(--coral)" />
                  : state === "selected" ? <CircleDot size={18} className="text-(--primary)" />
                  : <Circle size={18} className="text-(--slate)" />}
              </span>
              {(state === "correct" || state === "wrong") && (
                <span className={`absolute -top-2 right-3 text-[10px] font-bold uppercase tracking-wide px-1.5 rounded bg-white ${state === "correct" ? "text-(--green)" : "text-(--coral)"}`}>
                  {state === "correct" ? "Correct answer" : "Your answer"}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Free-text / numeric answer with a visible label and a checked state. */
export function AnswerInput({ id, type, value, onChange, disabled, result }: {
  id: string; type: "short_answer" | "numerical"; value: string; onChange: (v: string) => void; disabled?: boolean;
  result?: "correct" | "wrong";
}) {
  const border = result === "correct" ? "border-(--green)" : result === "wrong" ? "border-(--coral)" : "border-(--slate)";
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-(--ink-soft) mb-1.5">
        {type === "numerical" ? "Your answer (a number)" : "Your answer"}
      </label>
      <div className="relative">
        <input id={id} type={type === "numerical" ? "number" : "text"} inputMode={type === "numerical" ? "decimal" : undefined}
          value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} autoComplete="off"
          placeholder={type === "numerical" ? "Enter a number" : "Type your answer"}
          className={`w-full min-h-12 bg-white border rounded-xl px-4 pr-11 text-base outline-none disabled:opacity-80 ${border}`} />
        {result && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2" aria-hidden>
            {result === "correct" ? <CheckCircle2 size={20} className="text-(--green)" /> : <XCircle size={20} className="text-(--coral)" />}
          </span>
        )}
      </div>
    </div>
  );
}

/** The verdict after checking an answer. Announced to screen readers. */
export function AnswerFeedback({ correct, correctLabel, explanation, children }: {
  correct: boolean; correctLabel?: string | null; explanation?: string | null; children?: ReactNode;
}) {
  return (
    <div role="status" aria-live="polite"
      className={`fade-in rounded-xl border p-4 ${correct ? "border-(--green) bg-(--green-soft)" : "border-(--coral) bg-(--coral-soft)"}`}>
      <p className={`font-bold flex items-center gap-2 ${correct ? "text-(--green)" : "text-(--coral)"}`}>
        {correct ? <CheckCircle2 size={18} aria-hidden /> : <XCircle size={18} aria-hidden />}
        {correct ? "Correct!" : "Not quite — let's see why."}
      </p>
      {!correct && correctLabel && <p className="text-sm mt-2">Correct answer: <b>{correctLabel}</b></p>}
      {explanation && <p className="text-sm text-(--text) mt-2 leading-relaxed">{explanation}</p>}
      {children}
    </div>
  );
}
