"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";

type Topic = { id: string; path: string };

const EXAMPLE = `[
  {
    "q": "1/3 + 1/3 = ?",
    "options": ["2/3", "1/6", "2/6", "1/3"],
    "correct": 0,
    "difficulty": "easy",
    "explanation": "Same denominator — just add the numerators: 1+1=2, so 2/3."
  }
]`;

export default function ImportQuestionsPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [topicId, setTopicId] = useState("");
  const [json, setJson] = useState(EXAMPLE);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/topics-flat").then((r) => r.json()).then((d) => {
      setTopics(d.topics);
      if (d.topics[0]) setTopicId(d.topics[0].id);
    });
  }, []);

  async function submit() {
    setError(null);
    let items;
    try {
      items = JSON.parse(json);
    } catch {
      setError("That isn't valid JSON.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/questions/import", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId, items }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error?.formErrors?.[0] || "Import failed — check the JSON shape.");
      return;
    }
    router.push("/admin/questions");
  }

  return (
    <AdminShell title="Bulk Import Questions">
      <div className="bg-white rounded-2xl border p-5 max-w-xl space-y-3" style={{ borderColor: "var(--slate)" }}>
        <div>
          <label className="text-xs font-semibold text-[--ink-soft] block mb-1">Topic (all imported questions go here)</label>
          {!topics ? <p className="text-sm text-[--ink-soft]">Loading topics…</p> : (
            <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }}>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.path}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="text-xs font-semibold text-[--ink-soft] block mb-1">Questions (JSON array)</label>
          <textarea value={json} onChange={(e) => setJson(e.target.value)} rows={14} className="w-full border rounded-xl px-3 py-2 text-xs font-mono" style={{ borderColor: "var(--slate)" }} />
        </div>
        {error && <p className="text-sm text-[--coral]">{error}</p>}
        <button disabled={saving || !topicId} onClick={submit} className="tap px-6 py-2.5 rounded-full font-semibold text-sm text-white disabled:opacity-40" style={{ background: "var(--primary)" }}>
          {saving ? "Importing…" : "Import"}
        </button>
      </div>
    </AdminShell>
  );
}
