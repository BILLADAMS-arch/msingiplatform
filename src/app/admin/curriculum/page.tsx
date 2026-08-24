"use client";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { ChevronRight, Plus, Trash2, Pencil, Check, X } from "lucide-react";

type Row = { id: string; name: string; order?: number };
type Grade = { id: string; name: string; group: string };

type Level = "subjects" | "strands" | "subStrands" | "topics";

const LEVEL_CONFIG: Record<Level, { label: string; listUrl: (parentId: string) => string; parentKey: string; createUrl: string }> = {
  subjects: { label: "Subjects", listUrl: (gradeId) => `/api/admin/subjects?gradeId=${gradeId}`, parentKey: "gradeId", createUrl: "/api/admin/subjects" },
  strands: { label: "Strands", listUrl: (subjectId) => `/api/admin/strands?subjectId=${subjectId}`, parentKey: "subjectId", createUrl: "/api/admin/strands" },
  subStrands: { label: "Sub-strands", listUrl: (strandId) => `/api/admin/sub-strands?strandId=${strandId}`, parentKey: "strandId", createUrl: "/api/admin/sub-strands" },
  topics: { label: "Topics", listUrl: (subStrandId) => `/api/admin/topics?subStrandId=${subStrandId}`, parentKey: "subStrandId", createUrl: "/api/admin/topics" },
};
const LEVEL_ORDER: Level[] = ["subjects", "strands", "subStrands", "topics"];
const ITEM_KEY: Record<Level, string> = { subjects: "subjects", strands: "strands", subStrands: "subStrands", topics: "topics" };
const SINGLE_KEY: Record<Level, string> = { subjects: "subject", strands: "strand", subStrands: "subStrand", topics: "topic" };
const ENDPOINT: Record<Level, string> = { subjects: "/api/admin/subjects", strands: "/api/admin/strands", subStrands: "/api/admin/sub-strands", topics: "/api/admin/topics" };

export default function AdminCurriculumPage() {
  const [grades, setGrades] = useState<Grade[] | null>(null);
  const [gradeId, setGradeId] = useState("");
  const [trail, setTrail] = useState<{ level: Level; id: string; name: string }[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/grades").then((r) => r.json()).then((d) => {
      setGrades(d.grades);
      if (d.grades[0]) setGradeId(d.grades[0].id);
    });
  }, []);

  const level: Level = LEVEL_ORDER[trail.length];
  const parentId = trail.length ? trail[trail.length - 1].id : gradeId;

  const load = () => {
    if (!parentId) return;
    fetch(LEVEL_CONFIG[level].listUrl(parentId)).then((r) => r.json()).then((d) => setRows(d[ITEM_KEY[level]]));
  };
  useEffect(() => { load(); }, [gradeId, trail]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectGrade(id: string) {
    setGradeId(id);
    setTrail([]);
  }

  function drillInto(row: Row) {
    if (level === "topics") return; // topics are the leaf level
    setTrail((t) => [...t, { level, id: row.id, name: row.name }]);
  }

  function goTo(index: number) {
    setTrail((t) => t.slice(0, index));
  }

  async function add() {
    if (!newName.trim()) return;
    await fetch(LEVEL_CONFIG[level].createUrl, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [LEVEL_CONFIG[level].parentKey]: parentId, name: newName.trim() }),
    });
    setNewName("");
    load();
  }

  async function saveEdit() {
    if (!editing) return;
    await fetch(`${ENDPOINT[level]}/${editing.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editing.name }),
    });
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm(`Delete this ${SINGLE_KEY[level]}? This also deletes everything nested under it.`)) return;
    await fetch(`${ENDPOINT[level]}/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <AdminShell title="Curriculum">
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select value={gradeId} onChange={(e) => selectGrade(e.target.value)} className="border rounded-xl px-3 py-2 text-sm font-medium" style={{ borderColor: "var(--slate)" }}>
          {grades?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <div className="flex items-center gap-1 text-sm text-[--ink-soft] flex-wrap">
          <button onClick={() => goTo(0)} className="tap font-medium hover:text-[--ink]">Subjects</button>
          {trail.map((t, i) => (
            <span key={t.id} className="flex items-center gap-1">
              <ChevronRight size={14} />
              <button onClick={() => goTo(i + 1)} className="tap font-medium hover:text-[--ink]">{t.name}</button>
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "var(--slate)" }}>
        <h3 className="disp font-bold mb-3">{LEVEL_CONFIG[level].label}</h3>
        {!rows ? <p className="text-sm text-[--ink-soft]">Loading…</p> : (
          <div className="space-y-1.5">
            {rows.length === 0 && <p className="text-sm text-[--ink-soft] mb-2">Nothing here yet — add one below.</p>}
            {rows.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 border" style={{ borderColor: "var(--stone-2)" }}>
                {editing?.id === row.id ? (
                  <>
                    <input autoFocus value={editing.name} onChange={(e) => setEditing({ id: row.id, name: e.target.value })}
                      className="flex-1 border rounded-lg px-2 py-1 text-sm" style={{ borderColor: "var(--slate)" }} />
                    <button onClick={saveEdit} className="tap text-[--green]"><Check size={16} /></button>
                    <button onClick={() => setEditing(null)} className="tap text-[--ink-soft]"><X size={16} /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => drillInto(row)} disabled={level === "topics"} className="tap flex-1 text-left text-sm font-medium disabled:cursor-default">
                      {row.name}
                    </button>
                    {level !== "topics" && <ChevronRight size={14} className="text-[--ink-soft]" />}
                    <button onClick={() => setEditing({ id: row.id, name: row.name })} className="tap text-[--ink-soft]"><Pencil size={14} /></button>
                    <button onClick={() => remove(row.id)} className="tap text-[--coral]"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: "var(--stone-2)" }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder={`New ${SINGLE_KEY[level]} name`} className="flex-1 border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }} />
          <button onClick={add} className="tap flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--ink)" }}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
