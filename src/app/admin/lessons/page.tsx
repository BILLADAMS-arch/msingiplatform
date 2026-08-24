"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Pill } from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";

type Lesson = { id: string; title: string; published: boolean; topicName: string; subjectName: string };

export default function AdminLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const load = () => fetch("/api/admin/lessons").then((r) => r.json()).then((d) => setLessons(d.lessons));
  useEffect(() => { load(); }, []);

  async function togglePublished(l: Lesson) {
    await fetch(`/api/admin/lessons/${l.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: !l.published }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this lesson? This also deletes its sections and quick check.")) return;
    await fetch(`/api/admin/lessons/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <AdminShell title="Lessons">
      <div className="flex justify-end mb-4">
        <Link href="/admin/lessons/new" className="tap flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--ink)" }}>
          <Plus size={14} /> New Lesson
        </Link>
      </div>
      {!lessons ? <p className="text-sm text-[--ink-soft]">Loading…</p> : lessons.length === 0 ? (
        <p className="text-sm text-[--ink-soft]">No lessons yet.</p>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "var(--slate)" }}>
          {lessons.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--stone-2)" }}>
              <div className="min-w-0">
                <Link href={`/admin/lessons/${l.id}`} className="tap font-medium text-sm hover:text-[--gold-deep]">{l.title}</Link>
                <div className="text-xs text-[--ink-soft]">{l.subjectName} · {l.topicName}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => togglePublished(l)} className="tap">
                  <Pill tone={l.published ? "green" : "gold"}>{l.published ? "Published" : "Draft"}</Pill>
                </button>
                <button onClick={() => remove(l.id)} className="tap text-[--coral]"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
