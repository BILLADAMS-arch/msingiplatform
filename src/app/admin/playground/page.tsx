"use client";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Pill } from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";

type Activity = { id: string; area: string; title: string; description: string; enabled: boolean };
const AREAS = ["mathematics", "science", "computer", "language"] as const;

export default function AdminPlaygroundPage() {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState<typeof AREAS[number]>("mathematics");

  const load = () => fetch("/api/admin/playground").then((r) => r.json()).then((d) => setActivities(d.activities));
  useEffect(() => { load(); }, []);

  async function create() {
    if (!title.trim() || !description.trim()) return;
    await fetch("/api/admin/playground", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ area, title: title.trim(), description: description.trim() }),
    });
    setTitle(""); setDescription("");
    load();
  }

  async function toggleEnabled(a: Activity) {
    await fetch(`/api/admin/playground/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !a.enabled }) });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this activity?")) return;
    await fetch(`/api/admin/playground/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <AdminShell title="Playground Activities">
      <div className="bg-white rounded-2xl border p-5 max-w-lg space-y-3 mb-6" style={{ borderColor: "var(--slate)" }}>
        <h3 className="disp font-bold flex items-center gap-2"><Plus size={16} /> New activity</h3>
        <div className="flex gap-3">
          <select value={area} onChange={(e) => setArea(e.target.value as typeof area)} className="flex-1 border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }}>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="flex-1 border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }} />
        </div>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }} />
        <button disabled={!title.trim() || !description.trim()} onClick={create} className="tap px-5 py-2.5 rounded-full font-semibold text-sm text-white disabled:opacity-40" style={{ background: "var(--ink)" }}>Add</button>
      </div>

      {!activities ? <p className="text-sm text-[--ink-soft]">Loading…</p> : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "var(--slate)" }}>
          {activities.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--stone-2)" }}>
              <div className="min-w-0">
                <div className="font-medium text-sm">{a.title}</div>
                <div className="text-xs text-[--ink-soft]">{a.area} · {a.description}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => toggleEnabled(a)} className="tap"><Pill tone={a.enabled ? "green" : "gold"}>{a.enabled ? "Enabled" : "Disabled"}</Pill></button>
                <button onClick={() => remove(a.id)} className="tap text-[--coral]"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
