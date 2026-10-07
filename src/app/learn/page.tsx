"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Shell } from "@/components/shell";
import { Button, Card, FoundationBar, ErrorState, EmptyState, Pill, Skeleton, LoadingState, type Tone } from "@/components/ui";
import { subjectAccent } from "@/lib/subject-colors";
import { getProfile, getSubjects } from "@/lib/client-data";
import { bandFor, MASTERED } from "@/lib/mastery";
import { practiceHref } from "@/lib/links";
import { BookOpen, Dumbbell, Layers, Hourglass, ArrowRight, ChevronRight, Map } from "lucide-react";

type Subject = { id: string; name: string };
type RoadmapTopic = { id: string; name: string; order: number; lessonId: string | null; masteryPct: number };

/** Where a topic stands, from data the roadmap already returns. */
function topicStatus(t: RoadmapTopic): { label: string; tone: Tone; bar: Tone } {
  if (t.masteryPct <= 0 && !t.lessonId) return { label: "Coming soon", tone: "blue", bar: "blue" };
  if (t.masteryPct <= 0) return { label: "Not started", tone: "blue", bar: "blue" };
  const b = bandFor(t.masteryPct);
  return { label: b.label, tone: b.tone, bar: b.tone };
}

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
  const accent = subjectAccent(activeSubject?.name);

  // The learner's next step: the first topic with a lesson that isn't Strong yet,
  // otherwise the first topic with a lesson (so there is always one clear action).
  const withLesson = roadmap?.filter((t) => t.lessonId) ?? [];
  const next = withLesson.find((t) => t.masteryPct < MASTERED) ?? withLesson[0] ?? null;
  const nextVerb = next ? (next.masteryPct <= 0 ? "Start" : next.masteryPct >= MASTERED ? "Review" : "Continue") : "";

  return (
    <Shell>
      <div className="fade-in space-y-5 max-w-3xl">
        <header>
          <div className="text-xs font-bold uppercase tracking-wider text-(--ink-soft)">{gradeName ? `${gradeName} · Learn` : "Learn"}</div>
          <h1 className="disp text-3xl font-bold mt-0.5">{activeSubject?.name ?? "Your learning journey"}</h1>
        </header>

        {subjects && subjects.length > 1 && (
          <div className="flex gap-2 overflow-x-auto sm:flex-wrap pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Choose a subject">
            {subjects.map((s) => {
              const active = s.id === activeSubject?.id;
              const a = subjectAccent(s.name);
              return (
                <button key={s.id} onClick={() => router.push(`/learn?subjectId=${s.id}`)} aria-pressed={active}
                  className="tap shrink-0 min-h-11 px-4 rounded-full border text-sm font-semibold"
                  style={{ borderColor: active ? a.color : "var(--slate)", background: active ? a.color : "white", color: active ? "white" : "var(--ink)" }}>
                  {s.name}
                </button>
              );
            })}
          </div>
        )}

        {subjectsError ? (
          <Card><ErrorState compact title="We couldn't load your subjects" onRetry={() => { setSubjectsError(false); setSubjectsAttempt((a) => a + 1); }} /></Card>
        ) : !subjects ? (
          <LoadingState label="Loading subjects"><div className="space-y-3"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /></div></LoadingState>
        ) : subjects.length === 0 ? (
          <Card><EmptyState compact icon={<Map size={22} />} title={gradeName ? "No subjects yet" : "Choose your grade first"}
            description={gradeName ? "No subjects have been set up for your grade yet." : "Your account doesn't have a grade yet, so there are no subjects to show."}
            action={!gradeName ? <Button href="/profile" size="sm">Open profile</Button> : undefined} /></Card>
        ) : roadmapForSubject?.error ? (
          <Card><ErrorState compact title="We couldn't load this roadmap" onRetry={() => { setRoadmapState(null); setRoadmapAttempt((a) => a + 1); }} /></Card>
        ) : !roadmap ? (
          <LoadingState label="Loading roadmap"><div className="space-y-3"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /></div></LoadingState>
        ) : roadmap.length === 0 ? (
          <Card><EmptyState compact icon={<Map size={22} />} title="Topics are on the way"
            description={`No topics have been added for ${activeSubject?.name ?? "this subject"} yet. Check back soon, or try another subject.`} /></Card>
        ) : (
          <>
            <Card padding="lg" style={{ borderColor: accent.soft, background: `linear-gradient(135deg, ${accent.soft}, #fff 70%)` }}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-(--ink-soft)">Your mastery in {activeSubject?.name}</div>
                  <div className="disp text-3xl font-extrabold">{overall}%</div>
                </div>
                {next && (
                  <Button href={`/learn/lesson/${next.lessonId}`} size="lg" className="shrink-0">
                    {nextVerb} <ArrowRight size={16} aria-hidden />
                  </Button>
                )}
              </div>
              <div className="mt-3"><FoundationBar pct={overall} tone={overall >= MASTERED ? "green" : "blue"} height={8} label={`${activeSubject?.name} mastery`} /></div>
              {next && <p className="text-xs text-(--ink-soft) mt-2.5">{nextVerb === "Start" ? "Up next" : nextVerb === "Continue" ? "Pick up where you left off" : "Keep it fresh"}: <b className="text-(--ink)">{next.name}</b></p>}
            </Card>

            <ol className="space-y-3" aria-label="Topics">
              {roadmap.map((t, i) => {
                const st = topicStatus(t);
                const isNext = next?.id === t.id;
                const started = t.masteryPct > 0;
                const primaryLabel = t.masteryPct <= 0 ? "Start lesson" : t.masteryPct >= MASTERED ? "Review lesson" : "Continue";
                return (
                  <li key={t.id}>
                    <Card padding="none" className={isNext ? "ring-2 ring-(--primary)" : ""}>
                      <div className="p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          <span className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{ background: accent.soft, color: accent.color }} aria-hidden>{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="font-bold text-base break-words">
                                <Link href={`/learn/topic/${t.id}`} className="inline-flex items-center gap-0.5 hover:text-(--primary-deep) hover:underline underline-offset-2" aria-label={`Open ${t.name} topic overview`}>
                                  {t.name}<ChevronRight size={16} className="text-(--ink-soft)" aria-hidden />
                                </Link>
                              </h2>
                              <Pill tone={st.tone}>{st.label === "Coming soon" ? <><Hourglass size={12} aria-hidden /> Coming soon</> : st.label}</Pill>
                              {isNext && <Pill tone="gold">Up next</Pill>}
                            </div>
                            {started || t.lessonId ? (
                              <div className="flex items-center gap-3 mt-2.5">
                                <div className="flex-1 max-w-xs"><FoundationBar pct={t.masteryPct} tone={st.bar} height={6} label={`${t.name} mastery`} /></div>
                                <span className="text-xs font-semibold tabular-nums text-(--ink-soft)">{t.masteryPct}%</span>
                              </div>
                            ) : (
                              <p className="text-xs text-(--ink-soft) mt-1.5">Lessons for this topic are not published yet.</p>
                            )}
                          </div>
                        </div>
                        {(t.lessonId || started) && (
                          <div className="flex flex-wrap items-center gap-2 mt-3.5 sm:pl-11">
                            {t.lessonId && (
                              <Button href={`/learn/lesson/${t.lessonId}`} size="md" variant={isNext || t.masteryPct <= 0 ? "primary" : "secondary"}>
                                <BookOpen size={16} aria-hidden /> {primaryLabel}
                              </Button>
                            )}
                            <Button href={practiceHref({ id: t.id, name: t.name })} size="md" variant="secondary" aria-label={`Practise ${t.name}`}>
                              <Dumbbell size={16} aria-hidden /> Practise
                            </Button>
                            {t.lessonId && (
                              <Button href={`/flashcards?topicId=${t.id}`} size="md" variant="ghost" aria-label={`${t.name} flashcards`}>
                                <Layers size={16} aria-hidden /> Flashcards
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </Shell>
  );
}

export default function LearnPage() {
  return <Suspense><LearnInner /></Suspense>;
}
