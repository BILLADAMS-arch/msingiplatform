"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { Pill } from "@/components/ui";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";

type TestQuestion = { id: string; prompt: string; topicName: string };
type BankQuestion = { id: string; prompt: string; topicName: string };
type Topic = { id: string; path: string };

export default function EditTestPage() {
  const { testId } = useParams<{ testId: string }>();

  const [title, setTitle] = useState("");
  const [passingThreshold, setPassingThreshold] = useState(60);
  const [published, setPublished] = useState(false);
  const [selected, setSelected] = useState<TestQuestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [pickerTopicId, setPickerTopicId] = useState("");
  const [bank, setBank] = useState<BankQuestion[] | null>(null);

  useEffect(() => {
    fetch(`/api/admin/tests/${testId}`).then((r) => r.json()).then((d) => {
      setTitle(d.title); setPassingThreshold(d.passingThreshold); setPublished(d.published);
      setSelected(d.questions); setLoaded(true);
    });
    fetch("/api/admin/topics-flat").then((r) => r.json()).then((d) => {
      setTopics(d.topics);
      if (d.topics[0]) setPickerTopicId(d.topics[0].id);
    });
  }, [testId]);

  useEffect(() => {
    if (!pickerTopicId) return;
    fetch(`/api/admin/questions?topicId=${pickerTopicId}`).then((r) => r.json()).then((d) => setBank(d.questions));
  }, [pickerTopicId]);

  function addQuestion(q: BankQuestion) {
    if (selected.some((s) => s.id === q.id)) return;
    setSelected((s) => [...s, q]);
  }
  function removeQuestion(id: string) {
    setSelected((s) => s.filter((q) => q.id !== id));
  }
  function move(i: number, dir: -1 | 1) {
    setSelected((s) => {
      const copy = [...s];
      const j = i + dir;
      if (j < 0 || j >= copy.length) return copy;
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/admin/tests/${testId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, passingThreshold, questionIds: selected.map((s) => s.id) }),
    });
    setSaving(false);
  }

  async function togglePublished() {
    const next = !published;
    await fetch(`/api/admin/tests/${testId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: next }) });
    setPublished(next);
  }

  if (!loaded) return <AdminShell title="Edit Test"><p className="text-sm text-[--ink-soft]">Loading…</p></AdminShell>;

  return (
    <AdminShell title="Edit Test">
      <div className="max-w-3xl space-y-5">
        <div className="bg-white rounded-2xl border p-5 space-y-3" style={{ borderColor: "var(--slate)" }}>
          <div className="flex items-center gap-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 border rounded-xl px-3 py-2 text-sm font-semibold" style={{ borderColor: "var(--slate)" }} />
            <button onClick={togglePublished} className="tap"><Pill tone={published ? "green" : "gold"}>{published ? "Published" : "Draft"}</Pill></button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[--ink-soft]">Passing threshold</label>
            <input type="number" min={0} max={100} value={passingThreshold} onChange={(e) => setPassingThreshold(Number(e.target.value))} className="w-20 border rounded-lg px-2 py-1 text-sm" style={{ borderColor: "var(--slate)" }} />
            <span className="text-xs text-[--ink-soft]">%</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "var(--slate)" }}>
            <h3 className="disp font-bold mb-3">Test Questions ({selected.length})</h3>
            <div className="space-y-1.5">
              {selected.map((q, i) => (
                <div key={q.id} className="flex items-center justify-between gap-2 border rounded-lg px-3 py-2" style={{ borderColor: "var(--stone-2)" }}>
                  <span className="text-xs line-clamp-1 flex-1">{i + 1}. {q.prompt}</span>
                  <button onClick={() => move(i, -1)} className="tap text-[--ink-soft]"><ArrowUp size={12} /></button>
                  <button onClick={() => move(i, 1)} className="tap text-[--ink-soft]"><ArrowDown size={12} /></button>
                  <button onClick={() => removeQuestion(q.id)} className="tap text-[--coral]"><Trash2 size={12} /></button>
                </div>
              ))}
              {selected.length === 0 && <p className="text-sm text-[--ink-soft]">No questions added yet.</p>}
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "var(--slate)" }}>
            <h3 className="disp font-bold mb-3">Question Bank</h3>
            <select value={pickerTopicId} onChange={(e) => setPickerTopicId(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-xs mb-2" style={{ borderColor: "var(--slate)" }}>
              {topics?.map((t) => <option key={t.id} value={t.id}>{t.path}</option>)}
            </select>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {!bank ? <p className="text-sm text-[--ink-soft]">Loading…</p> : bank.map((q) => (
                <div key={q.id} className="flex items-center justify-between gap-2 border rounded-lg px-3 py-2" style={{ borderColor: "var(--stone-2)" }}>
                  <span className="text-xs line-clamp-1 flex-1">{q.prompt}</span>
                  <button onClick={() => addQuestion(q)} disabled={selected.some((s) => s.id === q.id)} className="tap text-[--gold-deep] disabled:opacity-30"><Plus size={14} /></button>
                </div>
              ))}
              {bank && bank.length === 0 && <p className="text-sm text-[--ink-soft]">No questions for this topic yet.</p>}
            </div>
          </div>
        </div>

        <button disabled={saving} onClick={save} className="tap px-6 py-2.5 rounded-full font-semibold text-sm text-white disabled:opacity-50" style={{ background: "var(--ink)" }}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </AdminShell>
  );
}
