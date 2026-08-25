"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Users, Plus } from "lucide-react";

type Class = { id: string; name: string; studentCount: number };

export default function TeacherPage() {
  const [classes, setClasses] = useState<Class[] | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () => fetch("/api/teacher/classes").then((r) => r.json()).then((d) => setClasses(d.classes));
  useEffect(() => { load(); }, []);

  async function create() {
    if (!name.trim()) return;
    setCreating(true);
    await fetch("/api/teacher/classes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
    setName("");
    setCreating(false);
    load();
  }

  return (
    <Shell variant="teacher">
      <div className="fade-in space-y-6">
        <h1 className="disp text-3xl font-bold">My Classes</h1>

        <div className="flex items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="New class name, e.g. Grade 7 Blue" className="flex-1 border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }} />
          <button disabled={creating || !name.trim()} onClick={create} className="tap flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: "var(--primary)" }}>
            <Plus size={14} /> Create
          </button>
        </div>

        {!classes ? <p className="text-sm text-[--ink-soft]">Loading…</p> : classes.length === 0 ? (
          <div className="text-center py-16">
            <Users size={36} className="mx-auto text-[--ink-soft] mb-3" />
            <p className="text-sm text-[--ink-soft]">No classes yet — create one above.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {classes.map((c) => (
              <Link key={c.id} href={`/teacher/classes/${c.id}`} className="tap brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-[--ink-soft] mt-1 flex items-center gap-1"><Users size={12} /> {c.studentCount} student{c.studentCount === 1 ? "" : "s"}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
