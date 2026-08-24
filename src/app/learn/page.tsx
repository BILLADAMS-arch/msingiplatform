"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Shell } from "@/components/shell";
import { FoundationBar } from "@/components/ui";
import { CheckCircle2, Target, Lock, Layers } from "lucide-react";

type Subject = { id: string; name: string };
type RoadmapTopic = { id: string; name: string; order: number; lessonId: string | null; masteryPct: number };

function LearnInner() {
  const params = useSearchParams();
  const router = useRouter();

  const [gradeName, setGradeName] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapTopic[] | null>(null);

  const requestedSubject = params.get("subject");
  const activeSubject = subjects?.find((s) => s.name === requestedSubject) ?? subjects?.[0] ?? null;

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then(async (p) => {
      setGradeName(p.gradeName);
      if (!p.gradeName) return;
      const subjRes = await fetch(`/api/curriculum/subjects?grade=${encodeURIComponent(p.gradeName)}`).then((r) => r.json());
      setSubjects(subjRes.subjects ?? []);
    });
  }, []);

  useEffect(() => {
    if (!activeSubject) return;
    fetch(`/api/curriculum/roadmap?subjectId=${activeSubject.id}`).then((r) => r.json()).then((d) => setRoadmap(d.roadmap));
  }, [activeSubject?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const overall = roadmap?.length ? Math.round(roadmap.reduce((a, t) => a + t.masteryPct, 0) / roadmap.length) : 0;

  return (
    <Shell>
      <div className="fade-in space-y-6">
        <div>
          <h1 className="disp text-2xl font-bold">{activeSubject?.name ?? "Learn"}</h1>
          <p className="text-sm text-[--ink-soft]">{gradeName || "…"} · {overall}% mastery</p>
          <div className="max-w-sm mt-2"><FoundationBar pct={overall} tone="green" /></div>
        </div>

        {subjects && subjects.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => {
              const active = s.id === activeSubject?.id;
              return (
                <button key={s.id} onClick={() => router.push(`/learn?subject=${encodeURIComponent(s.name)}`)}
                  className="tap px-4 py-2 rounded-full border text-sm font-semibold"
                  style={{ borderColor: active ? "var(--gold-deep)" : "var(--slate)", background: active ? "var(--gold-deep)" : "white", color: active ? "white" : "var(--ink)" }}>
                  {s.name}
                </button>
              );
            })}
          </div>
        )}

        <div className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
          <h3 className="disp font-bold mb-4">Learning Roadmap</h3>
          {!subjects ? (
            <p className="text-sm text-[--ink-soft]">Loading…</p>
          ) : subjects.length === 0 ? (
            <p className="text-sm text-[--ink-soft]">No subjects have been set up for your grade yet.</p>
          ) : !roadmap ? (
            <p className="text-sm text-[--ink-soft]">Loading roadmap…</p>
          ) : roadmap.length === 0 ? (
            <p className="text-sm text-[--ink-soft]">No topics have been added for this subject yet.</p>
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
                  <div key={t.id} className="flex items-center gap-1">
                    <Link href={`/learn/lesson/${t.lessonId}`}
                      className="tap flex items-center gap-2 rounded-xl px-4 py-3 border text-sm font-medium text-white"
                      style={{ borderColor: "var(--gold-deep)", background: "var(--gold-deep)" }}>
                      {content}
                    </Link>
                    <Link href={`/flashcards?topic=${encodeURIComponent(t.name)}`} title={`${t.name} flashcards`}
                      className="tap w-10 h-10 rounded-xl border flex items-center justify-center" style={{ borderColor: "var(--slate)" }}>
                      <Layers size={16} />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

export default function LearnPage() {
  return <Suspense><LearnInner /></Suspense>;
}
