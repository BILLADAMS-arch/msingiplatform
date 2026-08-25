"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Pill } from "@/components/ui";
import { Plus, Trash2, Upload } from "lucide-react";

type Topic = { id: string; path: string };
type Question = { id: string; prompt: string; difficulty: string; type: string; topicName: string };

export default function AdminQuestionsPage() {
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [topicId, setTopicId] = useState("");
  const [questions, setQuestions] = useState<Question[] | null>(null);

  useEffect(() => { fetch("/api/admin/topics-flat").then((r) => r.json()).then((d) => setTopics(d.topics)); }, []);

  const load = () => {
    const qs = topicId ? `?topicId=${topicId}` : "";
    fetch(`/api/admin/questions${qs}`).then((r) => r.json()).then((d) => setQuestions(d.questions));
  };
  useEffect(load, [topicId]);

  async function remove(id: string) {
    if (!confirm("Delete this question?")) return;
    await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <AdminShell title="Questions">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }}>
          <option value="">All topics</option>
          {topics?.map((t) => <option key={t.id} value={t.id}>{t.path}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <Link href="/admin/questions/import" className="tap flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold border" style={{ borderColor: "var(--slate)" }}>
            <Upload size={14} /> Bulk Import
          </Link>
          <Link href="/admin/questions/new" className="tap flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--primary)" }}>
            <Plus size={14} /> New Question
          </Link>
        </div>
      </div>

      {!questions ? <p className="text-sm text-[--ink-soft]">Loading…</p> : questions.length === 0 ? (
        <p className="text-sm text-[--ink-soft]">No questions found.</p>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "var(--slate)" }}>
          {questions.map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--stone-2)" }}>
              <div className="min-w-0">
                <Link href={`/admin/questions/${q.id}`} className="tap font-medium text-sm hover:text-[--primary] line-clamp-1">{q.prompt}</Link>
                <div className="text-xs text-[--ink-soft]">{q.topicName}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Pill tone={q.difficulty === "hard" ? "coral" : q.difficulty === "medium" ? "gold" : "green"}>{q.difficulty}</Pill>
                <button onClick={() => remove(q.id)} className="tap text-[--coral]"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
