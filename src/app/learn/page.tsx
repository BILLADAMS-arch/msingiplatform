"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Shell } from "@/components/shell";
import { FoundationBar, ErrorState, Skeleton, LoadingState } from "@/components/ui";
import { subjectAccent } from "@/lib/subject-colors";
import { getProfile, getSubjects } from "@/lib/client-data";
import { CheckCircle2, Target, Lock, Layers } from "lucide-react";

type Subject = { id: string; name: string };
type RoadmapTopic = { id: string; name: string; order: number; lessonId: string | null; masteryPct: number };

function LearnInner() {
  const params = useSearchParams();
  const router = useRouter();

  const [gradeName, setGradeName] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [subjectsError, setSubjectsError] = useState(false);
  const [subjectsAttempt, setSubjectsAttempt] = useState(0);
  // Keyed by subject so switching subjects never shows the previous roadmap.
  const [roadmapState, setRoadmapState] = useState<{ subjectId: string; roadmap: RoadmapTopic[] | null; error: boolean } | null>(null);
  const [roadmapAttempt, setRoadmapAttempt] = useState(0);

  // ?subjectId= is the identity; ?subject=<name> is still honoured for old links.
  const requestedSubjectId = params.get("subjectId");
  const requestedSubjectName = params.get("subject");
  const activeSubject = (requestedSubjectId ? subjects?.find((s) => s.id === requestedSubjectId) : subjects?.find((s) => s.name === requestedSubjectName))
    ?? subjects?.[0] ?? null;

  useEffect(() => {
    getProfile()
      .then(async (p) => {
        setGradeName(p.gradeName);
        // No grade on the account → nothing to load (previously this stayed on "Loading…").
        const subjRes = p.gradeId ? await getSubjects(p.gradeId) : { subjects: [] };
        setSubjects(subjRes.subjects ?? []);
      })
      .catch(() => setSubjectsError(true));
  }, [subjectsAttempt]);

  useEffect(() => {
    if (!activeSubject) return;
    const subjectId = activeSubject.id;
    fetch(`/api/curriculum/roadmap?subjectId=${subjectId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setRoadmapState({ subjectId, roadmap: d.roadmap ?? [], error: false }))
      .catch(() => setRoadmapState({ subjectId, roadmap: null, error: true }));
  }, [activeSubject?.id, roadmapAttempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const roadmapForSubject = roadmapState && roadmapState.subjectId === activeSubject?.id ? roadmapState : null;
  const roadmap = roadmapForSubject?.roadmap ?? null;

  const overall = roadmap?.length ? Math.round(roadmap.reduce((a, t) => a + t.masteryPct, 0) / roadmap.length) : 0;

  return (
    <Shell>
      <div className="fade-in space-y-6">
        <div className="relative mb-2">
          <div className="relative rounded-3xl overflow-hidden border shadow-sm" style={{ borderColor: "var(--slate)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-journey-1.jpeg" alt="Your learning journey — from lessons and practice to quizzes and mastery" className="w-full h-44 sm:h-56 md:h-64 object-cover" />
            <div className="absolute inset-0 flex items-end p-5" style={{ background: "linear-gradient(0deg, rgba(16,27,74,0.65), rgba(16,27,74,0) 60%)" }}>
              <div className="text-white">
                <div className="disp font-bold text-lg sm:text-xl">Your learning journey</div>
                <div className="text-xs sm:text-sm opacity-90 mt-0.5">From lessons to mastery, one topic at a time.</div>
              </div>
            </div>
          </div>
          <div className="hidden lg:block absolute -top-4 -left-4 w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-lg rotate-[-8deg]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-journey-0.jpeg" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="hidden lg:block absolute -top-4 right-10 w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-lg rotate-[6deg]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-journey-2.jpeg" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="hidden lg:block absolute top-1/3 -right-4 w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-lg rotate-[10deg]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-journey-3.jpeg" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="hidden lg:block absolute -bottom-4 left-12 w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-lg rotate-[-5deg]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-journey-4.jpeg" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="hidden lg:block absolute -bottom-4 right-1/3 w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-lg rotate-[7deg]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-journey-5.jpeg" alt="" className="w-full h-full object-cover" />
          </div>
        </div>

        <div>
          <h1 className="disp text-3xl font-bold">{activeSubject?.name ?? "Learn"}</h1>
          <p className="text-sm text-(--ink-soft)">{gradeName || "…"} · {overall}% mastery</p>
          <div className="max-w-sm mt-2"><FoundationBar pct={overall} tone="green" /></div>
        </div>

        {subjects && subjects.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => {
              const active = s.id === activeSubject?.id;
              const accent = subjectAccent(s.name);
              return (
                <button key={s.id} onClick={() => router.push(`/learn?subjectId=${s.id}`)}
                  className="tap px-4 py-2 rounded-full border text-sm font-semibold"
                  style={{ borderColor: active ? accent.color : "var(--slate)", background: active ? accent.color : "white", color: active ? "white" : "var(--ink)" }}>
                  {s.name}
                </button>
              );
            })}
          </div>
        )}

        <div className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
          <h3 className="disp font-bold mb-4">Learning Roadmap</h3>
          {subjectsError ? (
            <ErrorState compact title="We couldn't load your subjects" onRetry={() => { setSubjectsError(false); setSubjectsAttempt((a) => a + 1); }} />
          ) : !subjects ? (
            <LoadingState label="Loading subjects"><div className="flex flex-wrap gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-36" />)}</div></LoadingState>
          ) : subjects.length === 0 ? (
            <p className="text-sm text-(--ink-soft)">{gradeName ? "No subjects have been set up for your grade yet." : "Your account doesn't have a grade yet, so there are no subjects to show."}</p>
          ) : roadmapForSubject?.error ? (
            <ErrorState compact title="We couldn't load this roadmap" onRetry={() => { setRoadmapState(null); setRoadmapAttempt((a) => a + 1); }} />
          ) : !roadmap ? (
            <LoadingState label="Loading roadmap"><div className="flex flex-wrap gap-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-40" />)}</div></LoadingState>
          ) : roadmap.length === 0 ? (
            <p className="text-sm text-(--ink-soft)">No topics have been added for this subject yet.</p>
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
                      style={{ borderColor: "var(--primary)", background: "var(--primary)" }}>
                      {content}
                    </Link>
                    <Link href={`/flashcards?topicId=${t.id}`} title={`${t.name} flashcards`}
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
