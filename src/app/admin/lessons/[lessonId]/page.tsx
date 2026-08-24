"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { Pill } from "@/components/ui";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

type Section = { kind: "learn" | "example" | "keypoint" | "vocab"; heading: string; body: string; note: string };
type QuickCheck = { question: string; options: string[]; correctIndex: number; explanation: string };

const BLANK_SECTION: Section = { kind: "learn", heading: "", body: "", note: "" };
const BLANK_QUICK_CHECK: QuickCheck = { question: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" };

export default function EditLessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [published, setPublished] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [quickCheck, setQuickCheck] = useState<QuickCheck | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/lessons/${lessonId}`).then((r) => r.json()).then((d) => {
      setTitle(d.title);
      setPublished(d.published);
      setSections(d.sections.map((s: Section) => ({ ...s, note: s.note ?? "" })));
      setQuickCheck(d.quickCheck);
      setLoaded(true);
    });
  }, [lessonId]);

  function updateSection(i: number, patch: Partial<Section>) {
    setSections((ss) => ss.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function moveSection(i: number, dir: -1 | 1) {
    setSections((ss) => {
      const copy = [...ss];
      const j = i + dir;
      if (j < 0 || j >= copy.length) return copy;
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/admin/lessons/${lessonId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, sections, quickCheck }),
    });
    setSaving(false);
  }

  async function togglePublished() {
    const next = !published;
    await fetch(`/api/admin/lessons/${lessonId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: next }),
    });
    setPublished(next);
  }

  async function remove() {
    if (!confirm("Delete this lesson?")) return;
    await fetch(`/api/admin/lessons/${lessonId}`, { method: "DELETE" });
    router.push("/admin/lessons");
  }

  if (!loaded) return <AdminShell title="Edit Lesson"><p className="text-sm text-[--ink-soft]">Loading…</p></AdminShell>;

  return (
    <AdminShell title="Edit Lesson">
      <div className="space-y-5 max-w-2xl">
        <div className="bg-white rounded-2xl border p-5 space-y-3" style={{ borderColor: "var(--slate)" }}>
          <div className="flex items-center justify-between">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 border rounded-xl px-3 py-2 text-sm font-semibold mr-3" style={{ borderColor: "var(--slate)" }} />
            <button onClick={togglePublished} className="tap"><Pill tone={published ? "green" : "gold"}>{published ? "Published" : "Draft"}</Pill></button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-5 space-y-4" style={{ borderColor: "var(--slate)" }}>
          <div className="flex items-center justify-between">
            <h3 className="disp font-bold">Sections</h3>
            <button onClick={() => setSections((ss) => [...ss, { ...BLANK_SECTION }])} className="tap flex items-center gap-1 text-xs font-semibold text-[--gold-deep]"><Plus size={14} /> Add section</button>
          </div>
          {sections.map((s, i) => (
            <div key={i} className="border rounded-xl p-4 space-y-2" style={{ borderColor: "var(--stone-2)" }}>
              <div className="flex items-center gap-2">
                <select value={s.kind} onChange={(e) => updateSection(i, { kind: e.target.value as Section["kind"] })} className="border rounded-lg px-2 py-1 text-xs" style={{ borderColor: "var(--slate)" }}>
                  <option value="learn">learn</option><option value="example">example</option><option value="keypoint">keypoint</option><option value="vocab">vocab</option>
                </select>
                <input value={s.heading} onChange={(e) => updateSection(i, { heading: e.target.value })} placeholder="Heading" className="flex-1 border rounded-lg px-2 py-1 text-sm" style={{ borderColor: "var(--slate)" }} />
                <button onClick={() => moveSection(i, -1)} className="tap text-[--ink-soft]"><ArrowUp size={14} /></button>
                <button onClick={() => moveSection(i, 1)} className="tap text-[--ink-soft]"><ArrowDown size={14} /></button>
                <button onClick={() => setSections((ss) => ss.filter((_, idx) => idx !== i))} className="tap text-[--coral]"><Trash2 size={14} /></button>
              </div>
              <textarea value={s.body} onChange={(e) => updateSection(i, { body: e.target.value })} placeholder="Body" rows={2} className="w-full border rounded-lg px-2 py-1.5 text-sm" style={{ borderColor: "var(--slate)" }} />
              <input value={s.note} onChange={(e) => updateSection(i, { note: e.target.value })} placeholder="Note (optional)" className="w-full border rounded-lg px-2 py-1.5 text-sm" style={{ borderColor: "var(--slate)" }} />
            </div>
          ))}
          {sections.length === 0 && <p className="text-sm text-[--ink-soft]">No sections yet.</p>}
        </div>

        <div className="bg-white rounded-2xl border p-5 space-y-3" style={{ borderColor: "var(--slate)" }}>
          <div className="flex items-center justify-between">
            <h3 className="disp font-bold">Quick Check</h3>
            {quickCheck ? (
              <button onClick={() => setQuickCheck(null)} className="tap text-xs font-semibold text-[--coral]">Remove</button>
            ) : (
              <button onClick={() => setQuickCheck({ ...BLANK_QUICK_CHECK, options: [...BLANK_QUICK_CHECK.options] })} className="tap flex items-center gap-1 text-xs font-semibold text-[--gold-deep]"><Plus size={14} /> Add quick check</button>
            )}
          </div>
          {quickCheck && (
            <div className="space-y-2">
              <input value={quickCheck.question} onChange={(e) => setQuickCheck({ ...quickCheck, question: e.target.value })} placeholder="Question" className="w-full border rounded-lg px-2 py-1.5 text-sm" style={{ borderColor: "var(--slate)" }} />
              {quickCheck.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" checked={quickCheck.correctIndex === i} onChange={() => setQuickCheck({ ...quickCheck, correctIndex: i })} />
                  <input value={opt} onChange={(e) => setQuickCheck({ ...quickCheck, options: quickCheck.options.map((o, idx) => (idx === i ? e.target.value : o)) })}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`} className="flex-1 border rounded-lg px-2 py-1 text-sm" style={{ borderColor: "var(--slate)" }} />
                </div>
              ))}
              <textarea value={quickCheck.explanation} onChange={(e) => setQuickCheck({ ...quickCheck, explanation: e.target.value })} placeholder="Explanation" rows={2} className="w-full border rounded-lg px-2 py-1.5 text-sm" style={{ borderColor: "var(--slate)" }} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={remove} className="tap text-sm font-semibold text-[--coral]">Delete lesson</button>
          <button disabled={saving} onClick={save} className="tap px-6 py-2.5 rounded-full font-semibold text-sm text-white disabled:opacity-50" style={{ background: "var(--ink)" }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
