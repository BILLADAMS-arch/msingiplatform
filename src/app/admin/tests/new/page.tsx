"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";

type Subject = { id: string; path: string };

export default function NewTestPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"quick" | "standard" | "revision" | "full">("standard");
  const [passingThreshold, setPassingThreshold] = useState(60);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/subjects-flat").then((r) => r.json()).then((d) => {
      setSubjects(d.subjects);
      if (d.subjects[0]) setSubjectId(d.subjects[0].id);
    });
  }, []);

  async function create() {
    if (!title.trim() || !subjectId) return;
    setSaving(true);
    const res = await fetch("/api/admin/tests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, title: title.trim(), type, passingThreshold }),
    }).then((r) => r.json());
    router.push(`/admin/tests/${res.test.id}`);
  }

  return (
    <AdminShell title="New Test">
      <div className="bg-white rounded-2xl border p-5 max-w-lg space-y-4" style={{ borderColor: "var(--slate)" }}>
        <div>
          <label className="text-xs font-semibold text-[--ink-soft] block mb-1">Subject</label>
          {!subjects ? <p className="text-sm text-[--ink-soft]">Loading…</p> : (
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }}>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.path}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="text-xs font-semibold text-[--ink-soft] block mb-1">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Standard Test — Fractions" className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-[--ink-soft] block mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }}>
              <option value="quick">Quick (5)</option><option value="standard">Standard (10)</option><option value="revision">Revision (20)</option><option value="full">Full</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-[--ink-soft] block mb-1">Passing threshold (%)</label>
            <input type="number" min={0} max={100} value={passingThreshold} onChange={(e) => setPassingThreshold(Number(e.target.value))} className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }} />
          </div>
        </div>
        <button disabled={saving || !title.trim() || !subjectId} onClick={create} className="tap px-5 py-2.5 rounded-full font-semibold text-sm text-white disabled:opacity-40" style={{ background: "var(--ink)" }}>
          {saving ? "Creating…" : "Create & continue"}
        </button>
      </div>
    </AdminShell>
  );
}
