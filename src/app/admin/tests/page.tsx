"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Pill } from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";

type Test = { id: string; title: string; type: string; published: boolean; subjectName: string };

export default function AdminTestsPage() {
  const [tests, setTests] = useState<Test[] | null>(null);
  const load = () => fetch("/api/admin/tests").then((r) => r.json()).then((d) => setTests(d.tests));
  useEffect(() => { load(); }, []);

  async function togglePublished(t: Test) {
    await fetch(`/api/admin/tests/${t.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: !t.published }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this test?")) return;
    await fetch(`/api/admin/tests/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <AdminShell title="Tests">
      <div className="flex justify-end mb-4">
        <Link href="/admin/tests/new" className="tap flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--ink)" }}>
          <Plus size={14} /> New Test
        </Link>
      </div>
      {!tests ? <p className="text-sm text-[--ink-soft]">Loading…</p> : tests.length === 0 ? (
        <p className="text-sm text-[--ink-soft]">No tests yet.</p>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "var(--slate)" }}>
          {tests.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--stone-2)" }}>
              <div className="min-w-0">
                <Link href={`/admin/tests/${t.id}`} className="tap font-medium text-sm hover:text-[--gold-deep]">{t.title}</Link>
                <div className="text-xs text-[--ink-soft]">{t.subjectName} · {t.type}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => togglePublished(t)} className="tap"><Pill tone={t.published ? "green" : "gold"}>{t.published ? "Published" : "Draft"}</Pill></button>
                <button onClick={() => remove(t.id)} className="tap text-[--coral]"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
