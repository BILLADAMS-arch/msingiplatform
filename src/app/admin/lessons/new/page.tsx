"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";

type Topic = { id: string; path: string };

export default function NewLessonPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [topicId, setTopicId] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/topics-flat").then((r) => r.json()).then((d) => {
      setTopics(d.topics);
      if (d.topics[0]) setTopicId(d.topics[0].id);
    });
  }, []);

  async function create() {
    if (!title.trim() || !topicId) return;
    setSaving(true);
    const res = await fetch("/api/admin/lessons", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId, title: title.trim() }),
    }).then((r) => r.json());
    router.push(`/admin/lessons/${res.lesson.id}`);
  }

  return (
    <AdminShell title="New Lesson">
      <div className="bg-white rounded-2xl border p-5 max-w-lg space-y-4" style={{ borderColor: "var(--slate)" }}>
        <div>
          <label className="text-xs font-semibold text-[--ink-soft] block mb-1">Topic</label>
          {!topics ? <p className="text-sm text-[--ink-soft]">Loading topics…</p> : (
            <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }}>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.path}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="text-xs font-semibold text-[--ink-soft] block mb-1">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Adding Fractions"
            className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }} />
        </div>
        <button disabled={saving || !title.trim() || !topicId} onClick={create}
          className="tap px-5 py-2.5 rounded-full font-semibold text-sm text-white disabled:opacity-40" style={{ background: "var(--primary)" }}>
          {saving ? "Creating…" : "Create & continue"}
        </button>
      </div>
    </AdminShell>
  );
}
