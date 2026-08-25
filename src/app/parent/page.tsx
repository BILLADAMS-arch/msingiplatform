"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { StatCard, TopicChip, Pill } from "@/components/ui";
import { Flame, Star, Layers, Plus, UserRound } from "lucide-react";

type Child = { id: string; name: string | null; gradeName: string | null };
type Progress = {
  name: string | null; gradeName: string | null; xp: number; streak: number;
  subjectMastery: Record<string, number>; strongSubjects: string[]; weakSubjects: string[];
  completedTopicsCount: number; recentTests: { title: string; score: number; date: string }[];
};

function ChildCard({ child }: { child: Child }) {
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => { fetch(`/api/parent/children/${child.id}/progress`).then((r) => r.json()).then(setProgress); }, [child.id]);

  if (!progress) return <div className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}><p className="text-sm text-[--ink-soft]">Loading…</p></div>;

  return (
    <div className="brick bg-white rounded-2xl p-5 border space-y-4" style={{ borderColor: "var(--slate)" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="disp font-bold text-lg">{progress.name ?? child.name ?? "Learner"}</div>
          <div className="text-xs text-[--ink-soft]">{progress.gradeName ?? "—"}</div>
        </div>
        <div className="flex gap-2">
          <Pill tone="gold"><Flame size={12} /> {progress.streak}</Pill>
          <Pill tone="gold"><Star size={12} /> {progress.xp} XP</Pill>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Layers size={16} />} label="Topics Mastered" value={progress.completedTopicsCount} tone="green" />
        <StatCard icon={<Star size={16} />} label="Recent Avg Score" value={progress.recentTests.length ? `${Math.round(progress.recentTests.reduce((a, t) => a + t.score, 0) / progress.recentTests.length)}%` : "—"} tone="gold" />
      </div>

      {Object.keys(progress.subjectMastery).length > 0 && (
        <div>
          <div className="text-xs font-semibold text-[--ink-soft] mb-2">Subject mastery</div>
          <div className="space-y-1.5">
            {Object.entries(progress.subjectMastery).map(([name, pct]) => <TopicChip key={name} label={name} pct={pct} />)}
          </div>
        </div>
      )}

      {progress.weakSubjects.length > 0 && (
        <div className="text-xs text-[--coral]">Recommended revision: {progress.weakSubjects.join(", ")}</div>
      )}

      {progress.recentTests.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-[--ink-soft] mb-2">Recent tests</div>
          {progress.recentTests.map((t, i) => (
            <div key={i} className="flex items-center justify-between text-sm border-b last:border-0 py-1.5" style={{ borderColor: "var(--stone-2)" }}>
              <span className="text-[--ink-soft]">{t.title}</span>
              <span className="font-semibold">{t.score}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ParentPage() {
  const [children, setChildren] = useState<Child[] | null>(null);
  const [email, setEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => fetch("/api/parent/children").then((r) => r.json()).then((d) => setChildren(d.children));
  useEffect(() => { load(); }, []);

  async function linkChild() {
    if (!email.trim()) return;
    setLinking(true); setError(null);
    const res = await fetch("/api/parent/children", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim() }) });
    setLinking(false);
    if (!res.ok) { setError((await res.json()).error ?? "Could not link that account."); return; }
    setEmail("");
    load();
  }

  return (
    <Shell variant="parent">
      <div className="fade-in space-y-6">
        <h1 className="disp text-3xl font-bold">My Children</h1>

        <div>
          <div className="flex items-center gap-2">
            <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && linkChild()}
              placeholder="Child's account email" className="flex-1 border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }} />
            <button disabled={linking || !email.trim()} onClick={linkChild} className="tap flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40" style={{ background: "var(--primary)" }}>
              <Plus size={14} /> Link
            </button>
          </div>
          {error && <p className="text-sm text-[--coral] mt-2">{error}</p>}
        </div>

        {!children ? <p className="text-sm text-[--ink-soft]">Loading…</p> : children.length === 0 ? (
          <div className="text-center py-16">
            <UserRound size={36} className="mx-auto text-[--ink-soft] mb-3" />
            <p className="text-sm text-[--ink-soft]">Link your child&apos;s Msingi account by email to see their progress here.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {children.map((c) => <ChildCard key={c.id} child={c} />)}
          </div>
        )}
      </div>
    </Shell>
  );
}
