"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/shell";
import { Button, Card, Section, Pill, FoundationBar, ProgressRing, EmptyState, ErrorState, Skeleton, LoadingState } from "@/components/ui";
import { LineChart } from "@/components/charts";
import { subjectAccent } from "@/lib/subject-colors";
import { practiceHref } from "@/lib/links";
import { MASTERED, bandFor, liveStreak, type Band } from "@/lib/mastery";
import {
  Target, Dumbbell, BookOpen, BookMarked, ClipboardCheck, Trophy, Lock, CheckCircle2, XCircle, ArrowRight, Flame, Star, Layers, Info, RotateCcw, TrendingUp,
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/* Types — shapes returned by the existing APIs                             */
/* ---------------------------------------------------------------------- */

type TopicRow = { id: string; name: string; masteryPct: number; subjectId: string; subjectName: string; lessonId: string | null };
type Attempt = { date: string; score: number; testTitle: string; testId: string; passingThreshold: number; correct: number | null; total: number | null };
type ProgressResponse = {
  profile: { name: string; xp: number; streak: number } | null;
  topics: TopicRow[];
  subjectMastery: Record<string, number>;
  testHistory: Attempt[];
  achievements: { unlocked: { code: string; label: string; icon: string }[]; all: { code: string; label: string; icon: string }[] };
  openMistakeCount: number;
};
type ProfileResponse = { profile: { lastActiveAt: string | null; streak: number } | null; gradeName: string | null };
type Mistake = { id: string; topic: string };
type Subject = { id: string; name: string };
type Load<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw Object.assign(new Error(`${url} → ${r.status}`), { status: r.status });
  return r.json();
}

// Existing level display (unchanged rule: one level per 500 XP).
const LEVELS = ["Beginner", "Explorer", "Learner", "Scholar", "Expert", "Master"];
function levelForXP(xp: number) { return LEVELS[Math.min(LEVELS.length - 1, Math.floor(xp / 500))]; }

const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/* ---------------------------------------------------------------------- */
/* Page                                                                     */
/* ---------------------------------------------------------------------- */

export default function ProgressPage() {
  const [core, setCore] = useState<Load<{ progress: ProgressResponse; profile: ProfileResponse }>>({ status: "loading" });
  const [forbidden, setForbidden] = useState(false);
  const [subjects, setSubjects] = useState<Load<Subject[] | null>>({ status: "loading" });
  const [mistakes, setMistakes] = useState<Load<Mistake[]>>({ status: "loading" });

  const fetchCore = useCallback(() => {
    Promise.all([getJson<ProgressResponse>("/api/progress/me"), getJson<ProfileResponse>("/api/profile")])
      .then(([progress, profile]) => setCore({ status: "ready", data: { progress, profile } }))
      .catch((e: { status?: number }) => (e.status === 403 ? setForbidden(true) : setCore({ status: "error" })));
  }, []);
  const fetchSubjects = useCallback((gradeName: string) => {
    getJson<{ subjects: Subject[] }>(`/api/curriculum/subjects?grade=${encodeURIComponent(gradeName)}`)
      .then((d) => setSubjects({ status: "ready", data: d.subjects ?? [] }))
      .catch(() => setSubjects({ status: "error" }));
  }, []);
  const fetchMistakes = useCallback(() => {
    getJson<{ mistakes: Mistake[] }>("/api/mistakes")
      .then((d) => setMistakes({ status: "ready", data: d.mistakes ?? [] }))
      .catch(() => setMistakes({ status: "error" }));
  }, []);

  useEffect(() => { fetchCore(); fetchMistakes(); }, [fetchCore, fetchMistakes]);
  const gradeName = core.status === "ready" ? core.data.profile.gradeName : undefined;
  useEffect(() => { if (gradeName) fetchSubjects(gradeName); }, [gradeName, fetchSubjects]);
  const subjectsView: Load<Subject[] | null> = gradeName === null ? { status: "ready", data: null } : subjects;

  if (forbidden) {
    return <Shell><EmptyState icon={<Layers size={22} />} title="Progress is for student accounts" description="Use the navigation to find the right page for your role." /></Shell>;
  }
  if (core.status === "loading") return <Shell><ProgressSkeleton /></Shell>;
  if (core.status === "error") {
    return <Shell><Card><ErrorState title="We couldn't load your progress" onRetry={() => { setCore({ status: "loading" }); fetchCore(); }} /></Card></Shell>;
  }

  const { progress, profile } = core.data;
  const streak = liveStreak(profile.profile?.streak ?? 0, profile.profile?.lastActiveAt ?? null);
  const xp = progress.profile?.xp ?? 0;

  return (
    <Shell name={progress.profile?.name} xp={xp} streak={streak.days}>
      <div className="fade-in space-y-8">
        <header className="space-y-4">
          <div>
            <h1 className="disp text-2xl sm:text-3xl">My progress</h1>
            <p className="text-sm text-(--ink-soft) mt-1">What you know, what needs work, and what to practise next.</p>
          </div>
          <NextStep progress={progress} />
          <dl className="flex flex-wrap gap-2 text-xs">
            <StatChip icon={<Layers size={14} />} label="Level" value={levelForXP(xp)} />
            <StatChip icon={<Star size={14} />} label="XP" value={String(xp)} />
            <StatChip icon={<Flame size={14} />} label="Day streak" value={String(streak.days)} />
            <StatChip icon={<Trophy size={14} />} label="Achievements" value={`${progress.achievements.unlocked.length}/${progress.achievements.all.length}`} />
          </dl>
        </header>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3 xl:gap-6">
          <div className="xl:col-span-2"><FocusAreas topics={progress.topics} /></div>
          <SubjectProgress subjects={subjectsView} gradeName={profile.gradeName} subjectMastery={progress.subjectMastery} topics={progress.topics}
            onRetry={() => { if (gradeName) { setSubjects({ status: "loading" }); fetchSubjects(gradeName); } }} />
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3 xl:gap-6">
          <div className="xl:col-span-2"><TestHistory attempts={progress.testHistory} /></div>
          <Revision mistakes={mistakes} topics={progress.topics} onRetry={() => { setMistakes({ status: "loading" }); fetchMistakes(); }} />
        </div>

        <Achievements achievements={progress.achievements} />
      </div>
    </Shell>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white border border-(--slate) pl-2.5 pr-3 min-h-8">
      <span className="text-(--gold-deep)" aria-hidden>{icon}</span>
      <dt className="text-(--ink-soft)">{label}</dt>
      <dd className="font-bold text-(--ink)">{value}</dd>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Next step — one clear action from real signals                          */
/* ---------------------------------------------------------------------- */

function NextStep({ progress }: { progress: ProgressResponse }) {
  const sorted = [...progress.topics].sort((a, b) => a.masteryPct - b.masteryPct);
  const needs = sorted.find((t) => bandFor(t.masteryPct).label === "Needs practice");
  const improving = sorted.find((t) => bandFor(t.masteryPct).label === "Improving");

  let step: { title: string; reason: string; href: string; cta: string; icon: React.ReactNode };
  if (needs) {
    step = { title: `Practise ${needs.name}`, reason: `Your weakest topic right now — ${needs.masteryPct}% mastery.`, href: practiceHref({ id: needs.id, name: needs.name }), cta: "Practise", icon: <Dumbbell size={20} /> };
  } else if (progress.openMistakeCount > 0) {
    step = { title: "Review your mistakes", reason: `${progress.openMistakeCount} question${progress.openMistakeCount === 1 ? "" : "s"} waiting in your Mistake Book.`, href: "/mistakes", cta: "Review", icon: <BookMarked size={20} /> };
  } else if (improving) {
    step = { title: `Push ${improving.name} to Strong`, reason: `${improving.masteryPct}% mastery — Strong starts at ${MASTERED}%.`, href: practiceHref({ id: improving.id, name: improving.name }), cta: "Practise", icon: <TrendingUp size={20} /> };
  } else if (progress.topics.length === 0) {
    step = { title: "Start your first topic", reason: "Complete a lesson or practise a topic and your mastery will appear here.", href: "/learn", cta: "Go to Learn", icon: <BookOpen size={20} /> };
  } else {
    step = { title: "Check your understanding", reason: "Every topic you've worked on is Strong. A test will show whether it holds up.", href: "/tests", cta: "Browse tests", icon: <ClipboardCheck size={20} /> };
  }

  return (
    <section aria-labelledby="next-step-heading" className="rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center gap-4"
      style={{ background: "linear-gradient(135deg, var(--ink) 0%, #15336E 100%)" }}>
      <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.12)" }} aria-hidden>{step.icon}</span>
      <div className="flex-1 min-w-0">
        <h2 id="next-step-heading" className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.7)" }}>Your next step</h2>
        <p className="disp text-lg leading-tight mt-0.5" style={{ color: "white" }}>{step.title}</p>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.78)" }}>{step.reason}</p>
      </div>
      <Button href={step.href} className="bg-white! text-(--ink)! hover:bg-(--primary-soft)! shrink-0">{step.cta} <ArrowRight size={16} aria-hidden /></Button>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* Focus areas                                                              */
/* ---------------------------------------------------------------------- */

const BAND_ORDER: Band["label"][] = ["Needs practice", "Improving", "Strong"];

function FocusAreas({ topics }: { topics: TopicRow[] }) {
  const groups = useMemo(() => {
    const g: Record<Band["label"], TopicRow[]> = { "Needs practice": [], Improving: [], Strong: [] };
    for (const t of [...topics].sort((a, b) => a.masteryPct - b.masteryPct)) g[bandFor(t.masteryPct).label].push(t);
    return g;
  }, [topics]);

  return (
    <Section id="focus" title="Focus areas" description="Every topic you've started, grouped by mastery.">
      <Card padding="none">
        {topics.length === 0 ? (
          <EmptyState compact icon={<Target size={22} />} title="No topic mastery yet"
            description="Finish a lesson or answer some practice questions — each topic you work on will appear here with its mastery."
            action={<div className="flex flex-wrap gap-2 justify-center"><Button href="/learn" size="sm">Go to Learn</Button><Button href="/practice" size="sm" variant="secondary">Practise</Button></div>} />
        ) : (
          <>
            <ul className="flex flex-wrap gap-2 px-4 sm:px-5 pt-4" aria-label="Topic counts by mastery band">
              {BAND_ORDER.map((label) => (
                <li key={label}><Pill tone={bandFor(label === "Strong" ? 100 : label === "Improving" ? 60 : 0).tone}>{label}: {groups[label].length}</Pill></li>
              ))}
            </ul>
            {BAND_ORDER.filter((l) => l !== "Strong").map((label) => groups[label].length > 0 && (
              <div key={label} className="mt-3">
                <h3 className="px-4 sm:px-5 text-xs font-bold uppercase tracking-wider text-(--ink-soft)">{label}</h3>
                <ul className="divide-y divide-(--stone-2) mt-1">{groups[label].map((t) => <TopicLine key={t.id} t={t} />)}</ul>
              </div>
            ))}
            {groups.Strong.length > 0 && (
              <details className="group mt-3 border-t border-(--stone-2)" open={groups["Needs practice"].length + groups.Improving.length === 0}>
                <summary className="cursor-pointer list-none px-4 sm:px-5 min-h-12 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-(--ink-soft) hover:text-(--ink)">
                  <span>Strong ({groups.Strong.length})</span>
                  <span className="normal-case tracking-normal font-semibold text-(--primary-deep) group-open:hidden">Show</span>
                  <span className="normal-case tracking-normal font-semibold text-(--primary-deep) hidden group-open:inline">Hide</span>
                </summary>
                <ul className="divide-y divide-(--stone-2)">{groups.Strong.map((t) => <TopicLine key={t.id} t={t} />)}</ul>
              </details>
            )}
            <MasteryExplainer />
          </>
        )}
      </Card>
    </Section>
  );
}

function TopicLine({ t }: { t: TopicRow }) {
  const band = bandFor(t.masteryPct);
  const accent = subjectAccent(t.subjectName);
  return (
    <li className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{t.name}</span>
          <Pill tone={band.tone}>{band.label}</Pill>
        </div>
        <div className="text-xs text-(--ink-soft) mt-0.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent.color }} aria-hidden />{t.subjectName}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 max-w-xs"><FoundationBar pct={t.masteryPct} tone={band.tone} height={6} label={`${t.name} topic mastery`} /></div>
          <span className="text-xs font-semibold tabular-nums whitespace-nowrap">{t.masteryPct}% mastery</span>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {t.lessonId && (
          <Button href={`/learn/lesson/${t.lessonId}`} variant="secondary" size="sm" aria-label={`Review the ${t.name} lesson`}><BookOpen size={14} aria-hidden /> Lesson</Button>
        )}
        <Button href={practiceHref({ id: t.id, name: t.name })} size="sm" variant={band.label === "Strong" ? "secondary" : "primary"} aria-label={`Practise ${t.name}`}>
          <Dumbbell size={14} aria-hidden /> Practise
        </Button>
      </div>
    </li>
  );
}

// Describes the EXISTING rules (see api/practice/attempts, api/lessons/.../complete,
// api/tests/attempts) so the numbers are understandable — it doesn't change them.
function MasteryExplainer() {
  return (
    <details className="border-t border-(--stone-2)">
      <summary className="cursor-pointer list-none px-4 sm:px-5 min-h-11 flex items-center gap-2 text-xs font-semibold text-(--ink-soft) hover:text-(--ink)">
        <Info size={14} aria-hidden /> How topic mastery is worked out
      </summary>
      <ul className="px-4 sm:px-5 pb-4 space-y-1 text-xs text-(--ink-soft) list-disc list-inside">
        <li>Each correct practice answer raises mastery; each wrong one lowers it a little.</li>
        <li>Taking a test sets the topic&apos;s mastery to your score on that topic&apos;s questions.</li>
        <li>Finishing a lesson brings a new topic up to at least 15%.</li>
        <li>Bands: below 50% Needs practice · 50–69% Improving · {MASTERED}% and above Strong.</li>
      </ul>
    </details>
  );
}

/* ---------------------------------------------------------------------- */
/* Subject progress                                                         */
/* ---------------------------------------------------------------------- */

function SubjectProgress({ subjects, gradeName, subjectMastery, topics, onRetry }: {
  subjects: Load<Subject[] | null>; gradeName: string | null; subjectMastery: Record<string, number>; topics: TopicRow[]; onRetry: () => void;
}) {
  return (
    <Section id="subjects" title="Subjects" description="Subject mastery comes from your test results.">
      <Card padding="none">
        {subjects.status === "loading" ? (
          <LoadingState label="Loading subjects"><div className="p-4 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div></LoadingState>
        ) : subjects.status === "error" ? (
          <ErrorState compact title="We couldn't load your subjects" onRetry={onRetry} />
        ) : !subjects.data || !gradeName ? (
          <EmptyState compact icon={<Layers size={22} />} title="No grade on your account" description="Subjects are shown for your grade." />
        ) : subjects.data.length === 0 ? (
          <EmptyState compact icon={<Layers size={22} />} title="No subjects yet" description={`Subjects for ${gradeName} haven't been set up yet.`} />
        ) : (
          <ul className="divide-y divide-(--stone-2)">
            {subjects.data.map((s) => {
              const mastery = subjectMastery[s.name];
              const started = topics.filter((t) => t.subjectId === s.id);
              const strong = started.filter((t) => t.masteryPct >= MASTERED).length;
              const accent = subjectAccent(s.name);
              return (
                <li key={s.id} className="px-4 py-3.5 flex items-center gap-3">
                  {mastery !== undefined ? (
                    <ProgressRing pct={mastery} size={44} stroke={4} tone={bandFor(mastery).tone} label={`${s.name} test mastery ${mastery}%, ${bandFor(mastery).label}`}>
                      <span className="text-[11px] font-bold">{mastery}%</span>
                    </ProgressRing>
                  ) : (
                    <span className="w-11 h-11 rounded-full border-2 border-dashed border-(--slate) shrink-0" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: accent.color }} aria-hidden />
                      <span className="truncate">{s.name}</span>
                    </h3>
                    <p className="text-xs text-(--ink-soft) mt-0.5">
                      {mastery !== undefined ? <>{bandFor(mastery).label} · test mastery</> : "Not started yet — no tests taken"}
                      {started.length > 0 && <> · {started.length} topic{started.length === 1 ? "" : "s"} started{strong ? `, ${strong} strong` : ""}</>}
                    </p>
                  </div>
                  <Button href={`/learn?subject=${encodeURIComponent(s.name)}`} size="sm" variant="ghost" aria-label={`Learn ${s.name}`}>Learn</Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* Test history                                                             */
/* ---------------------------------------------------------------------- */

function TestHistory({ attempts }: { attempts: Attempt[] }) {
  const [showAll, setShowAll] = useState(false);
  // testHistory is newest-first; the previous attempt of the same test is the next older one.
  const rows = attempts.map((a, i) => {
    const prev = attempts.slice(i + 1).find((p) => p.testId === a.testId);
    return { ...a, passed: a.score >= a.passingThreshold, change: prev ? a.score - prev.score : null };
  });
  const shown = showAll ? rows : rows.slice(0, 5);
  const trend = [...attempts].reverse();
  const passedCount = rows.filter((r) => r.passed).length;

  return (
    <Section id="tests" title="Test history" description="Scores are checked against each test's own pass mark."
      action={<Button href="/tests" variant="ghost" size="sm">All tests <ArrowRight size={14} aria-hidden /></Button>}>
      <Card padding="none">
        {rows.length === 0 ? (
          <EmptyState compact icon={<ClipboardCheck size={22} />} title="No tests taken yet"
            description="A test shows your score by topic and updates your subject mastery."
            action={<Button href="/tests" size="sm">Browse tests</Button>} />
        ) : (
          <>
            {trend.length >= 2 && (
              <div className="px-4 sm:px-5 pt-4 pb-2 border-b border-(--stone-2)">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold">Score trend</h3>
                  <span className="text-xs text-(--ink-soft)">{passedCount} of {rows.length} passed</span>
                </div>
                <p className="text-xs text-(--ink-soft)">All tests, oldest to newest.</p>
                <div className="mt-2">
                  <LineChart tone="blue" data={trend.map((t) => ({ label: `${t.testTitle} (${fmtDate(t.date)})`, value: t.score }))}
                    description={`Test scores over ${trend.length} attempts, from ${trend[0].score}% to ${trend[trend.length - 1].score}%.`} />
                </div>
              </div>
            )}
            <ul className="divide-y divide-(--stone-2)">
              {shown.map((r, i) => (
                <li key={`${r.testId}-${r.date}-${i}`} className="px-4 sm:px-5 py-3 flex items-center gap-3">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${r.passed ? "bg-(--green-soft) text-(--green)" : "bg-(--coral-soft) text-(--coral)"}`} aria-hidden>
                    {r.passed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate">{r.testTitle}</div>
                    <div className="text-xs text-(--ink-soft) flex flex-wrap gap-x-2">
                      <span>{fmtDate(r.date)}</span>
                      <span>{r.passed ? "Passed" : "Below pass mark"} ({r.passingThreshold}%)</span>
                      {r.correct !== null && r.total !== null && <span>{r.correct}/{r.total} correct</span>}
                      {r.change !== null && <span>{r.change > 0 ? `+${r.change}` : r.change} vs previous</span>}
                    </div>
                  </div>
                  <span className="font-bold tabular-nums text-sm">{r.score}%</span>
                  <Button href={`/tests/${r.testId}`} size="sm" variant="ghost" aria-label={`Retake ${r.testTitle}`}><RotateCcw size={14} aria-hidden /><span className="hidden sm:inline">Retake</span></Button>
                </li>
              ))}
            </ul>
            {rows.length > 5 && (
              <div className="px-4 sm:px-5 py-2 border-t border-(--stone-2)">
                <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                  {showAll ? "Show fewer" : `Show all ${rows.length} attempts`}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* Revision — Mistake Book summary                                          */
/* ---------------------------------------------------------------------- */

function Revision({ mistakes, topics, onRetry }: { mistakes: Load<Mistake[]>; topics: TopicRow[]; onRetry: () => void }) {
  const byTopic = useMemo(() => {
    if (mistakes.status !== "ready") return [];
    const counts = new Map<string, number>();
    for (const m of mistakes.data) counts.set(m.topic, (counts.get(m.topic) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [mistakes]);
  const idByName = useMemo(() => new Map(topics.map((t) => [t.name, t.id])), [topics]);

  return (
    <Section id="revision" title="Revision" description="Questions you got wrong, ready to revisit.">
      <Card padding="none">
        {mistakes.status === "loading" ? (
          <LoadingState label="Loading your mistakes"><div className="p-4 space-y-3"><Skeleton className="h-10" /><Skeleton className="h-10" /></div></LoadingState>
        ) : mistakes.status === "error" ? (
          <ErrorState compact title="We couldn't load your mistakes" onRetry={onRetry} />
        ) : mistakes.data.length === 0 ? (
          <EmptyState compact icon={<BookMarked size={22} />} title="No mistakes to review"
            description="When you get a question wrong in practice or a test, it's saved here so you can revise it." />
        ) : (
          <>
            <div className="px-4 pt-4">
              <p className="text-sm"><b className="disp text-2xl">{mistakes.data.length}</b> <span className="text-(--ink-soft)">question{mistakes.data.length === 1 ? "" : "s"} in your Mistake Book</span></p>
              <p className="text-xs text-(--ink-soft) mt-1">Review why each answer was wrong, then practise the topic and retest.</p>
            </div>
            <ul className="divide-y divide-(--stone-2) mt-3 border-t border-(--stone-2)">
              {byTopic.slice(0, 5).map(([topic, n]) => (
                <li key={topic} className="px-4 py-2.5 flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate"><b>{topic}</b> <span className="text-(--ink-soft)">· {n} mistake{n === 1 ? "" : "s"}</span></span>
                  <Button href={practiceHref({ id: idByName.get(topic), name: topic })} size="sm" variant="ghost" aria-label={`Practise ${topic}`}><Dumbbell size={14} aria-hidden /> Practise</Button>
                </li>
              ))}
            </ul>
            {byTopic.length > 5 && <p className="px-4 pb-1 text-xs text-(--ink-soft)">+{byTopic.length - 5} more topic{byTopic.length - 5 === 1 ? "" : "s"}</p>}
            <div className="p-4 border-t border-(--stone-2)">
              <Button href="/mistakes" full><BookMarked size={16} aria-hidden /> Review mistakes</Button>
            </div>
          </>
        )}
      </Card>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* Achievements                                                             */
/* ---------------------------------------------------------------------- */

function Achievements({ achievements }: { achievements: ProgressResponse["achievements"] }) {
  const unlocked = new Set(achievements.unlocked.map((a) => a.code));
  return (
    <Section id="achievements" className="scroll-mt-24" title="Achievements"
      description={achievements.all.length ? `${achievements.unlocked.length} of ${achievements.all.length} unlocked` : undefined}>
      {achievements.all.length === 0 ? (
        <Card><EmptyState compact icon={<Trophy size={22} />} title="No achievements available yet" /></Card>
      ) : (
        <ul className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
          {achievements.all.map((a) => {
            const got = unlocked.has(a.code);
            return (
              <li key={a.code}>
                <Card padding="sm" className={`h-full text-center ${got ? "border-(--gold)!" : ""}`} style={got ? { background: "var(--amber-soft)" } : undefined}>
                  <div className={`text-3xl ${got ? "" : "grayscale opacity-40"}`} aria-hidden>{a.icon}</div>
                  <div className="text-xs font-semibold mt-1.5 leading-snug">{a.label}</div>
                  <div className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold ${got ? "text-(--gold-deep)" : "text-(--muted)"}`}>
                    {got ? <><CheckCircle2 size={12} aria-hidden /> Unlocked</> : <><Lock size={12} aria-hidden /> Locked</>}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* Skeleton                                                                 */
/* ---------------------------------------------------------------------- */

function ProgressSkeleton() {
  return (
    <LoadingState label="Loading your progress">
      <div className="space-y-8">
        <div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72 max-w-full" /></div>
        <Skeleton className="h-24 rounded-2xl" />
        <div className="grid gap-6 xl:grid-cols-3"><Skeleton className="h-72 rounded-2xl xl:col-span-2" /><Skeleton className="h-72 rounded-2xl" /></div>
      </div>
    </LoadingState>
  );
}
