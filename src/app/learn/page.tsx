"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { FoundationBar } from "@/components/ui";
import { CheckCircle2, Target, Lock } from "lucide-react";

type RoadmapTopic = { id: string; name: string; order: number; lessonId: string | null; masteryPct: number };

export default function LearnPage() {
  const [gradeName, setGradeName] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapTopic[] | null>(null);

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then(async (p) => {
      const grade = p.gradeName;
      setGradeName(grade);
      if (!grade) return;
      const subjRes = await fetch(`/api/curriculum/subjects?grade=${encodeURIComponent(grade)}`).then((r) => r.json());
      const math = subjRes.subjects?.find((s: { name: string }) => s.name === "Mathematics");
      if (!math) return;
      setSubjectId(math.id);
      const roadmapRes = await fetch(`/api/curriculum/roadmap?subjectId=${math.id}`).then((r) => r.json());
      setRoadmap(roadmapRes.roadmap);
    });
  }, []);

  const overall = roadmap?.length ? Math.round(roadmap.reduce((a, t) => a + t.masteryPct, 0) / roadmap.length) : 0;

  return (
    <Shell>
      <div className="fade-in space-y-6">
        <div>
          <h1 className="disp text-2xl font-bold">Mathematics</h1>
          <p className="text-sm text-[--ink-soft]">{gradeName || "…"} · {overall}% mastery</p>
          <div className="max-w-sm mt-2"><FoundationBar pct={overall} tone="green" /></div>
        </div>
        <div className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
          <h3 className="disp font-bold mb-4">Learning Roadmap</h3>
          {!roadmap ? (
            <p className="text-sm text-[--ink-soft]">Loading roadmap…</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {roadmap.map((t) => {
                const mastered = t.masteryPct >= 70;
                const started = t.masteryPct > 0;
                const content = (
                  <>
                    {mastered ? <CheckCircle2 size={14} /> : t.lessonId ? <Target size={14} /> : <Lock size={14} />}
                    {t.name}
                    {started && <span className="text-xs opacity-80">({t.masteryPct}%)</span>}
                  </>
                );
                if (!t.lessonId) {
                  return <div key={t.id} className="flex items-center gap-2 rounded-xl px-4 py-3 border text-sm font-medium opacity-50 cursor-not-allowed" style={{ borderColor: "var(--slate)" }}>{content}</div>;
                }
                return (
                  <Link key={t.id} href={`/learn/lesson/${t.lessonId}`}
                    className="tap flex items-center gap-2 rounded-xl px-4 py-3 border text-sm font-medium text-white"
                    style={{ borderColor: "var(--gold-deep)", background: "var(--gold-deep)" }}>
                    {content}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
