"use client";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { StatCard } from "@/components/ui";
import { Users, BookOpen, HelpCircle, ClipboardCheck, Library } from "lucide-react";

type Stats = {
  userCounts: { STUDENT: number; TEACHER: number; PARENT: number; ADMIN: number };
  contentCounts: { lessons: number; questions: number; tests: number; resources: number };
  difficultTopics: { name: string; avgMastery: number; students: number }[];
  popularSubjects: { name: string; students: number }[];
};

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => { fetch("/api/admin/stats").then((r) => r.json()).then(setStats); }, []);

  if (!stats) return <AdminShell title="Analytics"><p className="text-sm text-[--ink-soft]">Loading…</p></AdminShell>;

  return (
    <AdminShell title="Analytics">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Users size={18} />} label="Students" value={stats.userCounts.STUDENT} tone="green" />
        <StatCard icon={<BookOpen size={18} />} label="Lessons" value={stats.contentCounts.lessons} tone="gold" />
        <StatCard icon={<HelpCircle size={18} />} label="Questions" value={stats.contentCounts.questions} tone="gold" />
        <StatCard icon={<ClipboardCheck size={18} />} label="Tests" value={stats.contentCounts.tests} tone="gold" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "var(--slate)" }}>
          <h3 className="disp font-bold mb-3">Most Difficult Topics</h3>
          {stats.difficultTopics.length === 0 ? <p className="text-sm text-[--ink-soft]">No student progress data yet.</p> : (
            <div className="space-y-2">
              {stats.difficultTopics.map((t) => (
                <div key={t.name} className="flex items-center justify-between text-sm border-b last:border-0 py-1.5" style={{ borderColor: "var(--stone-2)" }}>
                  <span>{t.name} <span className="text-xs text-[--ink-soft]">({t.students} students)</span></span>
                  <span className="font-semibold" style={{ color: t.avgMastery < 50 ? "var(--coral)" : "var(--gold-deep)" }}>{t.avgMastery}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "var(--slate)" }}>
          <h3 className="disp font-bold mb-3 flex items-center gap-2"><Library size={16} /> Popular Subjects</h3>
          {stats.popularSubjects.length === 0 ? <p className="text-sm text-[--ink-soft]">No enrollment data yet.</p> : (
            <div className="space-y-2">
              {stats.popularSubjects.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm border-b last:border-0 py-1.5" style={{ borderColor: "var(--stone-2)" }}>
                  <span>{s.name}</span>
                  <span className="font-semibold">{s.students} student{s.students === 1 ? "" : "s"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
