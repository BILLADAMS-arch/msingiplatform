"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Shell } from "@/components/shell";
import { StatCard, TopicChip, Pill } from "@/components/ui";
import { Users, Layers, TrendingUp, AlertTriangle, ClipboardCheck, Plus, X } from "lucide-react";

type ClassDetail = { class: { id: string; name: string }; roster: { id: string; name: string | null; email: string }[] };
type Dashboard = {
  classAverage: number; difficultTopics: { name: string; avgMastery: number; students: number }[];
  improving: { id: string; name: string | null }[]; needingSupport: { id: string; name: string | null }[];
};
type Assignment = { id: string; testId: string; testTitle: string; dueAt: string | null };
type TeacherTest = { id: string; title: string; subjectName: string };
type Completion = { testTitle: string; dueAt: string | null; completion: { studentId: string; name: string | null; completed: boolean; score: number | null }[] };

type Tab = "roster" | "performance" | "assignments";

export default function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const [tab, setTab] = useState<Tab>("performance");
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [availableTests, setAvailableTests] = useState<TeacherTest[] | null>(null);
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [selectedTestId, setSelectedTestId] = useState("");
  const [openCompletion, setOpenCompletion] = useState<{ id: string; data: Completion } | null>(null);

  const loadDetail = () => fetch(`/api/teacher/classes/${classId}`).then((r) => r.json()).then(setDetail);
  const loadDashboard = () => fetch(`/api/teacher/classes/${classId}/dashboard`).then((r) => r.json()).then(setDashboard);
  const loadAssignments = () => fetch(`/api/teacher/classes/${classId}/assignments`).then((r) => r.json()).then((d) => setAssignments(d.assignments));

  useEffect(() => {
    loadDetail(); loadDashboard(); loadAssignments();
    fetch("/api/teacher/tests").then((r) => r.json()).then((d) => { setAvailableTests(d.tests); if (d.tests[0]) setSelectedTestId(d.tests[0].id); });
  }, [classId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addStudent() {
    if (!newStudentEmail.trim()) return;
    const res = await fetch(`/api/teacher/classes/${classId}/students`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: newStudentEmail.trim() }),
    });
    if (res.ok) { setNewStudentEmail(""); loadDetail(); loadDashboard(); }
    else alert((await res.json()).error ?? "Could not add student.");
  }

  async function removeStudent(studentId: string) {
    await fetch(`/api/teacher/classes/${classId}/students?studentId=${studentId}`, { method: "DELETE" });
    loadDetail(); loadDashboard();
  }

  async function createAssignment() {
    if (!selectedTestId) return;
    await fetch(`/api/teacher/classes/${classId}/assignments`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ testId: selectedTestId }),
    });
    loadAssignments();
  }

  async function viewCompletion(a: Assignment) {
    const data = await fetch(`/api/teacher/classes/${classId}/assignments/${a.id}`).then((r) => r.json());
    setOpenCompletion({ id: a.id, data });
  }

  return (
    <Shell variant="teacher">
      <div className="fade-in space-y-5">
        <h1 className="disp text-2xl font-bold">{detail?.class.name ?? "Class"}</h1>

        <div className="flex gap-1">
          {(["performance", "roster", "assignments"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`tap px-4 py-2 rounded-full text-sm font-semibold capitalize ${tab === t ? "text-white" : ""}`}
              style={{ background: tab === t ? "var(--ink)" : "white", border: "1px solid var(--slate)" }}>
              {t}
            </button>
          ))}
        </div>

        {tab === "performance" && (
          <div className="space-y-4">
            {!dashboard ? <p className="text-sm text-[--ink-soft]">Loading…</p> : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <StatCard icon={<Layers size={18} />} label="Class Average" value={`${dashboard.classAverage}%`} tone="green" />
                  <StatCard icon={<TrendingUp size={18} />} label="Improving" value={dashboard.improving.length} tone="gold" />
                  <StatCard icon={<AlertTriangle size={18} />} label="Needing Support" value={dashboard.needingSupport.length} tone="coral" />
                </div>
                <div className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
                  <h3 className="disp font-bold mb-3">Most Difficult Topics</h3>
                  {dashboard.difficultTopics.length === 0 ? <p className="text-sm text-[--ink-soft]">No progress data yet.</p> : (
                    <div className="space-y-2">{dashboard.difficultTopics.map((t) => <TopicChip key={t.name} label={t.name} pct={t.avgMastery} />)}</div>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
                    <h3 className="disp font-bold mb-3">Improving</h3>
                    {dashboard.improving.length === 0 ? <p className="text-sm text-[--ink-soft]">No one flagged yet.</p> : dashboard.improving.map((s) => <div key={s.id} className="text-sm py-1">{s.name ?? "Unnamed student"}</div>)}
                  </div>
                  <div className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
                    <h3 className="disp font-bold mb-3">Needing Support</h3>
                    {dashboard.needingSupport.length === 0 ? <p className="text-sm text-[--ink-soft]">No one flagged yet.</p> : dashboard.needingSupport.map((s) => <div key={s.id} className="text-sm py-1">{s.name ?? "Unnamed student"}</div>)}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "roster" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addStudent()}
                placeholder="Student email" className="flex-1 border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }} />
              <button onClick={addStudent} className="tap flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--ink)" }}><Plus size={14} /> Add</button>
            </div>
            {!detail ? <p className="text-sm text-[--ink-soft]">Loading…</p> : detail.roster.length === 0 ? (
              <div className="text-center py-12"><Users size={32} className="mx-auto text-[--ink-soft] mb-2" /><p className="text-sm text-[--ink-soft]">No students yet.</p></div>
            ) : (
              <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "var(--slate)" }}>
                {detail.roster.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--stone-2)" }}>
                    <div><div className="font-medium text-sm">{s.name ?? "Unnamed student"}</div><div className="text-xs text-[--ink-soft]">{s.email}</div></div>
                    <button onClick={() => removeStudent(s.id)} className="tap text-[--coral]"><X size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "assignments" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <select value={selectedTestId} onChange={(e) => setSelectedTestId(e.target.value)} className="flex-1 border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }}>
                {availableTests?.map((t) => <option key={t.id} value={t.id}>{t.subjectName} — {t.title}</option>)}
              </select>
              <button onClick={createAssignment} className="tap flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--ink)" }}><Plus size={14} /> Assign</button>
            </div>
            {!assignments ? <p className="text-sm text-[--ink-soft]">Loading…</p> : assignments.length === 0 ? (
              <div className="text-center py-12"><ClipboardCheck size={32} className="mx-auto text-[--ink-soft] mb-2" /><p className="text-sm text-[--ink-soft]">No assignments yet.</p></div>
            ) : (
              <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "var(--slate)" }}>
                {assignments.map((a) => (
                  <button key={a.id} onClick={() => viewCompletion(a)} className="tap w-full text-left flex items-center justify-between px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--stone-2)" }}>
                    <span className="font-medium text-sm">{a.testTitle}</span>
                    <span className="text-xs text-[--gold-deep] font-semibold">View completion →</span>
                  </button>
                ))}
              </div>
            )}
            {openCompletion && (
              <div className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="disp font-bold">{openCompletion.data.testTitle}</h3>
                  <button onClick={() => setOpenCompletion(null)} className="tap"><X size={16} /></button>
                </div>
                <div className="space-y-1.5">
                  {openCompletion.data.completion.map((c) => (
                    <div key={c.studentId} className="flex items-center justify-between text-sm py-1">
                      <span>{c.name ?? "Unnamed student"}</span>
                      {c.completed ? <Pill tone="green">{c.score}%</Pill> : <Pill tone="coral">Not started</Pill>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
