"use client";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Pill } from "@/components/ui";
import { Trash2, Upload } from "lucide-react";

type Subject = { id: string; gradeId: string; path: string };
type Topic = { id: string; subjectId: string; path: string };
type Resource = { id: string; title: string; type: string; published: boolean; fileUrl: string | null; subjectName: string };

const TYPES = ["notes", "worksheet", "past_paper", "marking_scheme", "video", "summary", "flashcard_set"];

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [topics, setTopics] = useState<Topic[] | null>(null);

  const [title, setTitle] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => fetch("/api/admin/resources").then((r) => r.json()).then((d) => setResources(d.resources));
  useEffect(() => {
    load();
    fetch("/api/admin/subjects-flat").then((r) => r.json()).then((d) => { setSubjects(d.subjects); if (d.subjects[0]) setSubjectId(d.subjects[0].id); });
    fetch("/api/admin/topics-flat").then((r) => r.json()).then((d) => setTopics(d.topics));
  }, []);

  async function togglePublished(r: Resource) {
    await fetch(`/api/admin/resources/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: !r.published }) });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this resource?")) return;
    await fetch(`/api/admin/resources/${id}`, { method: "DELETE" });
    load();
  }

  async function upload() {
    setError(null);
    const subject = subjects?.find((s) => s.id === subjectId);
    if (!file || !title.trim() || !subject) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    form.append("title", title.trim());
    form.append("type", type);
    form.append("gradeId", subject.gradeId);
    form.append("subjectId", subjectId);
    if (topicId) form.append("topicId", topicId);
    const res = await fetch("/api/admin/resources", { method: "POST", body: form });
    setUploading(false);
    if (!res.ok) { setError("Upload failed."); return; }
    setTitle(""); setFile(null);
    load();
  }

  const topicsForSubject = topics?.filter((t) => t.subjectId === subjectId) ?? [];

  return (
    <AdminShell title="Resources">
      <div className="bg-white rounded-2xl border p-5 max-w-xl space-y-3 mb-6" style={{ borderColor: "var(--slate)" }}>
        <h3 className="disp font-bold flex items-center gap-2"><Upload size={16} /> Upload a resource</h3>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }} />
        <div className="flex gap-3">
          <select value={type} onChange={(e) => setType(e.target.value)} className="flex-1 border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId(""); }} className="flex-1 border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }}>
            {subjects?.map((s) => <option key={s.id} value={s.id}>{s.path}</option>)}
          </select>
        </div>
        <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }}>
          <option value="">No specific topic</option>
          {topicsForSubject.map((t) => <option key={t.id} value={t.id}>{t.path}</option>)}
        </select>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm" />
        {error && <p className="text-sm text-[--coral]">{error}</p>}
        <button disabled={uploading || !file || !title.trim()} onClick={upload} className="tap px-5 py-2.5 rounded-full font-semibold text-sm text-white disabled:opacity-40" style={{ background: "var(--primary)" }}>
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>

      {!resources ? <p className="text-sm text-[--ink-soft]">Loading…</p> : resources.length === 0 ? (
        <p className="text-sm text-[--ink-soft]">No resources yet.</p>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "var(--slate)" }}>
          {resources.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--stone-2)" }}>
              <div className="min-w-0">
                <div className="font-medium text-sm">{r.title}</div>
                <div className="text-xs text-[--ink-soft]">{r.subjectName} · {r.type}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => togglePublished(r)} className="tap"><Pill tone={r.published ? "green" : "gold"}>{r.published ? "Published" : "Draft"}</Pill></button>
                <button onClick={() => remove(r.id)} className="tap text-[--coral]"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
