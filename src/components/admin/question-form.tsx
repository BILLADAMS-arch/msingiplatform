"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export type QuestionDraft = {
  topicId: string;
  type: "multiple_choice" | "true_false";
  prompt: string;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
  options: { label: string; isCorrect: boolean }[];
};

const BLANK: QuestionDraft = {
  topicId: "", type: "multiple_choice", prompt: "", difficulty: "medium", explanation: "",
  options: [{ label: "", isCorrect: true }, { label: "", isCorrect: false }],
};

type Topic = { id: string; path: string };

export function QuestionForm({ initial, onSubmit, submitLabel }: { initial?: Partial<QuestionDraft>; onSubmit: (draft: QuestionDraft) => void; submitLabel: string }) {
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [draft, setDraft] = useState<QuestionDraft>({ ...BLANK, ...initial, options: initial?.options?.length ? initial.options : BLANK.options });

  useEffect(() => {
    fetch("/api/admin/topics-flat").then((r) => r.json()).then((d) => {
      setTopics(d.topics);
      setDraft((cur) => (cur.topicId ? cur : { ...cur, topicId: d.topics[0]?.id ?? "" }));
    });
  }, []);

  function setOption(i: number, patch: Partial<{ label: string; isCorrect: boolean }>) {
    setDraft((d) => ({ ...d, options: d.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)) }));
  }
  function setCorrect(i: number) {
    setDraft((d) => ({ ...d, options: d.options.map((o, idx) => ({ ...o, isCorrect: idx === i })) }));
  }

  const canSubmit = draft.topicId && draft.prompt.trim() && draft.explanation.trim() && draft.options.every((o) => o.label.trim()) && draft.options.some((o) => o.isCorrect);

  return (
    <div className="bg-white rounded-2xl border p-5 max-w-xl space-y-3" style={{ borderColor: "var(--slate)" }}>
      <div>
        <label className="text-xs font-semibold text-[--ink-soft] block mb-1">Topic</label>
        {!topics ? <p className="text-sm text-[--ink-soft]">Loading topics…</p> : (
          <select value={draft.topicId} onChange={(e) => setDraft({ ...draft, topicId: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }}>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.path}</option>)}
          </select>
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs font-semibold text-[--ink-soft] block mb-1">Type</label>
          <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as QuestionDraft["type"] })} className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }}>
            <option value="multiple_choice">Multiple choice</option>
            <option value="true_false">True / False</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs font-semibold text-[--ink-soft] block mb-1">Difficulty</label>
          <select value={draft.difficulty} onChange={(e) => setDraft({ ...draft, difficulty: e.target.value as QuestionDraft["difficulty"] })} className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }}>
            <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-[--ink-soft] block mb-1">Prompt</label>
        <textarea value={draft.prompt} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} rows={2} className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }} />
      </div>

      <div>
        <label className="text-xs font-semibold text-[--ink-soft] block mb-1">Options (select the correct one)</label>
        <div className="space-y-2">
          {draft.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" checked={o.isCorrect} onChange={() => setCorrect(i)} />
              <input value={o.label} onChange={(e) => setOption(i, { label: e.target.value })} placeholder={`Option ${String.fromCharCode(65 + i)}`}
                className="flex-1 border rounded-lg px-2 py-1.5 text-sm" style={{ borderColor: "var(--slate)" }} />
              {draft.options.length > 2 && (
                <button onClick={() => setDraft({ ...draft, options: draft.options.filter((_, idx) => idx !== i) })} className="tap text-[--coral]"><Trash2 size={14} /></button>
              )}
            </div>
          ))}
        </div>
        {draft.options.length < 6 && (
          <button onClick={() => setDraft({ ...draft, options: [...draft.options, { label: "", isCorrect: false }] })} className="tap flex items-center gap-1 text-xs font-semibold text-[--gold-deep] mt-2">
            <Plus size={14} /> Add option
          </button>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-[--ink-soft] block mb-1">Explanation</label>
        <textarea value={draft.explanation} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} rows={2} className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }} />
      </div>

      <button disabled={!canSubmit} onClick={() => onSubmit(draft)} className="tap px-6 py-2.5 rounded-full font-semibold text-sm text-white disabled:opacity-40" style={{ background: "var(--ink)" }}>
        {submitLabel}
      </button>
    </div>
  );
}
