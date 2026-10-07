"use client";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Button, Card, Section, EmptyState, ErrorState, Skeleton, LoadingState, StatCard, Pill, FoundationBar, ProgressRing } from "@/components/ui";
import { subjectAccent } from "@/lib/subject-colors";
import { practiceHref } from "@/lib/links";
import { MASTERED, bandFor, liveStreak } from "@/lib/mastery";
import { levelProgress } from "@/lib/levels";
import { getProfile, getSubjects } from "@/lib/client-data";
import {
  Flame, Star, Target, CheckCircle2, ArrowRight, BookOpen, Dumbbell, BookMarked, ClipboardCheck, Zap, Trophy, Layers, Settings,
} from "lucide-react";

/* ---------------------------------------------------------------------- */
/* Types — shapes returned by the existing APIs                             */
/* ---------------------------------------------------------------------- */

type ProgressResponse = {
  profile: { name: string; xp: number; streak: number; goal: string | null } | null;
  topics: TopicMastery[];
  subjects: { id: string; masteryPct: number }[];
  testHistory: { date: string; score: number; testTitle: string; testId: string }[];
  achievements: { unlocked: { code: string }[]; all: { code: string }[] };
  openMistakeCount: number;
};
type ProfileResponse = {
  profile: { name: string; xp: number; streak: number; lastActiveAt: string | null; questionsAnswered: number; questionsCorrect: number } | null;
  gradeId: string | null;
  gradeName: string | null;
};
type TopicMastery = { id: string; name: string; masteryPct: number; subjectName?: string };
type Subject = { id: string; name: string };
type RoadmapTopic = { id: string; name: string; order: number; lessonId: string | null; masteryPct: number };
type Curriculum = { subjects: Subject[]; roadmaps: Record<string, RoadmapTopic[]> };
type Challenge = { targetCount: number; correctStreak: number; completed: boolean };
type Test = { id: string; title: string; passingThreshold: number };

type Load<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

/* ---------------------------------------------------------------------- */
/* Derivations from real data (no new mastery rules)                        */
/* ---------------------------------------------------------------------- */

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw Object.assign(new Error(`${url} → ${res.status}`), { status: res.status });
  return res.json();
}

/* ---------------------------------------------------------------------- */
/* Page                                                                     */
/* ---------------------------------------------------------------------- */

const noopSubscribe = () => () => {};

export default function DashboardPage() {
  const [core, setCore] = useState<Load<{ progress: ProgressResponse; profile: ProfileResponse }>>({ status: "loading" });
  const [forbidden, setForbidden] = useState(false);
  const [curriculumState, setCurriculum] = useState<Load<Curriculum>>({ status: "loading" });
  const [challenge, setChallenge] = useState<Load<Challenge>>({ status: "loading" });
  // Grade rank from the existing leaderboard API; stays null (and hidden) unless it is real.
  const [rank, setRank] = useState<{ rank: number; total: number } | null>(null);
  // Read from the learner's clock on the client; null during prerender.
  const greeting = useSyncExternalStore(noopSubscribe, () => greetingFor(new Date().getHours()), () => null);

  // Fetchers only set state once the request settles; the "loading" state is
  // the initial value, or set by the Retry handlers below.
  const fetchCore = useCallback(() => {
    Promise.all([getJson<ProgressResponse>("/api/progress/me"), getProfile<ProfileResponse>()])
      .then(([progress, profile]) => setCore({ status: "ready", data: { progress, profile } }))
      .catch((e: { status?: number }) => {
        if (e.status === 403) setForbidden(true);
        else setCore({ status: "error" });
      });
  }, []);

  // Subjects for the learner's grade and each subject's roadmap — the same
  // requests the previous dashboard made, fetched once and shared by the
  // Continue, Focus, Recommended and Subjects sections.
  const fetchCurriculum = useCallback((gradeId: string) => {
    getSubjects<{ subjects: Subject[] }>(gradeId)
      .then(async ({ subjects }) => {
        const roadmaps = await Promise.all(subjects.map((s) => getJson<{ roadmap: RoadmapTopic[] }>(`/api/curriculum/roadmap?subjectId=${s.id}`)));
        setCurriculum({ status: "ready", data: { subjects, roadmaps: Object.fromEntries(subjects.map((s, i) => [s.id, roadmaps[i].roadmap ?? []])) } });
      })
      .catch(() => setCurriculum({ status: "error" }));
  }, []);

  const fetchChallenge = useCallback(() => {
    getJson<Challenge>("/api/challenges/today").then((data) => setChallenge({ status: "ready", data })).catch(() => setChallenge({ status: "error" }));
  }, []);

  const fetchRank = useCallback(() => {
    getJson<{ rows: unknown[]; myRank: number | null; optedOut?: boolean }>("/api/leaderboard")
      .then((d) => setRank(d.myRank && d.rows.length >= 2 && !d.optedOut ? { rank: d.myRank, total: d.rows.length } : null))
      .catch(() => setRank(null));
  }, []);

  useEffect(() => { fetchCore(); fetchChallenge(); fetchRank(); }, [fetchCore, fetchChallenge, fetchRank]);
  const gradeId = core.status === "ready" ? core.data.profile.gradeId : undefined;
  useEffect(() => { if (gradeId) fetchCurriculum(gradeId); }, [gradeId, fetchCurriculum]);

  const retryCore = () => { setCore({ status: "loading" }); fetchCore(); };
  const retryCurriculum = () => { if (gradeId) { setCurriculum({ status: "loading" }); fetchCurriculum(gradeId); } };
  const retryChallenge = () => { setChallenge({ status: "loading" }); fetchChallenge(); };
  // No grade on the account → nothing to fetch; sections show a "no grade" state.
  const curriculum: Load<Curriculum | null> = gradeId === null ? { status: "ready", data: null } : curriculumState;

  if (forbidden) {
    return (
      <Shell>
        <EmptyState icon={<Layers size={22} />} title="This dashboard is for students"
          description="Your account doesn't have a student dashboard — use the navigation to find the right one for your role." />
      </Shell>
    );
  }

  if (core.status === "loading") return <Shell><DashboardSkeleton /></Shell>;
  if (core.status === "error") {
    return (
      <Shell>
        <Card><ErrorState title="We couldn't load your dashboard" onRetry={retryCore} /></Card>
      </Shell>
    );
  }

  const { progress, profile } = core.data;
  const p = profile.profile;
  const name = p?.name ?? progress.profile?.name;
  const firstName = name?.trim().split(/\s+/)[0];
  const streak = liveStreak(p?.streak ?? 0, p?.lastActiveAt ?? null);

  return (
    <Shell name={name} xp={p?.xp} streak={streak.days}>
      <div className="fade-in space-y-8">
        <header>
          <h1 className="disp text-2xl sm:text-3xl">
            {greeting ?? "Welcome back"}{firstName ? `, ${firstName}` : ""} <span aria-hidden>👋</span>
          </h1>
          <p className="text-(--ink-soft) text-sm mt-1">
            {profile.gradeName ? `${profile.gradeName} · ` : ""}Here&apos;s where you are and what to do next.
          </p>
        </header>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <ContinueLearning curriculum={curriculum} gradeName={profile.gradeName} onRetry={retryCurriculum} />
          </div>
          <Snapshot profile={p} streak={streak} rank={rank} />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <FocusAreas topics={progress.topics} curriculum={curriculum} />
            <YourMastery topics={progress.topics} />
          </div>
          <RecommendedNext progress={progress} curriculum={curriculum} challenge={challenge} onRetryChallenge={retryChallenge} />
        </div>

        <MySubjects curriculum={curriculum} subjectMastery={Object.fromEntries(progress.subjects.map((x) => [x.id, x.masteryPct]))} gradeName={profile.gradeName} onRetry={retryCurriculum} />

        <RecentProgress progress={progress} />
      </div>
    </Shell>
  );
}

/* ---------------------------------------------------------------------- */
/* Continue learning                                                        */
/* ---------------------------------------------------------------------- */

type ContinuePick = { subject: Subject; topic: RoadmapTopic; started: boolean };

// The existing dashboard rule, unchanged: the least-mastered topic that's in
// progress (0 < mastery < 70), otherwise the first topic not started yet.
// Msingi doesn't store a "last lesson opened", so this is the best real signal.
function pickContinue(c: Curriculum): { pick: ContinuePick | null; hasLessons: boolean } {
  const all = c.subjects.flatMap((subject) => (c.roadmaps[subject.id] ?? []).filter((t) => t.lessonId).map((topic) => ({ subject, topic })));
  const inProgress = all.filter((x) => x.topic.masteryPct > 0 && x.topic.masteryPct < MASTERED).sort((a, b) => a.topic.masteryPct - b.topic.masteryPct);
  const notStarted = all.filter((x) => x.topic.masteryPct === 0);
  const hit = inProgress[0] ?? notStarted[0];
  return { pick: hit ? { ...hit, started: hit.topic.masteryPct > 0 } : null, hasLessons: all.length > 0 };
}

function ContinueLearning({ curriculum, gradeName, onRetry }: { curriculum: Load<Curriculum | null>; gradeName: string | null; onRetry: () => void }) {
  if (curriculum.status === "loading") {
    return <LoadingState label="Loading your next lesson"><Skeleton className="h-full min-h-48 rounded-2xl" /></LoadingState>;
  }
  if (curriculum.status === "error") {
    return <Card className="h-full"><ErrorState compact title="We couldn't load your lessons" onRetry={onRetry} /></Card>;
  }
  if (!curriculum.data || !gradeName) {
    return (
      <Card className="h-full">
        <EmptyState compact icon={<Settings size={22} />} title="Your account doesn't have a grade yet"
          description="Msingi shows lessons for your grade, so there's nothing to continue until one is set on your account." />
      </Card>
    );
  }

  const { pick, hasLessons } = pickContinue(curriculum.data);
  if (!pick) {
    return (
      <Card className="h-full">
        {hasLessons ? (
          <EmptyState compact icon={<CheckCircle2 size={22} />} title="Every lesson topic is at Strong mastery"
            description="Keep it that way with practice and tests."
            action={<Button href="/tests" variant="secondary">Browse tests</Button>} />
        ) : (
          <EmptyState compact icon={<BookOpen size={22} />} title="No lessons for your grade yet"
            description={`Lessons for ${gradeName} haven't been published yet. Check back soon.`} />
        )}
      </Card>
    );
  }

  const accent = subjectAccent(pick.subject.name);
  const { topic, subject, started } = pick;
  return (
    <section aria-labelledby="continue-heading" className="h-full rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden flex flex-col"
      style={{ background: "linear-gradient(135deg, var(--ink) 0%, #15336E 100%)", boxShadow: "var(--shadow-raised)" }}>
      <div aria-hidden className="absolute -right-16 -top-16 w-56 h-56 rounded-full opacity-25" style={{ background: accent.color }} />
      <div className="relative flex-1">
        <div className="flex items-center justify-between gap-3">
          <h2 id="continue-heading" className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.7)" }}>
            {started ? "Continue learning" : "Start learning"}
          </h2>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }}>
            {started ? "In progress" : "Not started yet"}
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm font-semibold">
          <span className="w-2 h-2 rounded-full" style={{ background: accent.color }} aria-hidden />
          {subject.name}
        </div>
        <p className="disp text-2xl sm:text-3xl mt-1 leading-tight" style={{ color: "white" }}>{topic.name}</p>
        {started ? (
          <div className="mt-4 max-w-sm">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.75)" }}>
              <span>Topic mastery</span><span className="font-semibold text-white">{topic.masteryPct}%</span>
            </div>
            <FoundationBar pct={topic.masteryPct} tone="green" height={8} label={`${topic.name} mastery`} />
          </div>
        ) : (
          <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.75)" }}>Next up in {subject.name} — begin with the lesson, then practise.</p>
        )}
      </div>
      <div className="relative flex flex-col sm:flex-row gap-2.5 mt-6">
        <Button href={`/learn/lesson/${topic.lessonId}`} size="lg" className="bg-white! text-(--ink)! hover:bg-(--primary-soft)!">
          {started ? "Continue lesson" : "Start lesson"} <ArrowRight size={18} aria-hidden />
        </Button>
        {started && (
          <Button href={practiceHref({ id: topic.id, name: topic.name })} size="lg" variant="ghost" className="text-white! hover:bg-white/10!">
            <Dumbbell size={16} aria-hidden /> Practise {topic.name}
          </Button>
        )}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* Snapshot                                                                 */
/* ---------------------------------------------------------------------- */

function Snapshot({ profile, streak, rank }: { profile: ProfileResponse["profile"]; streak: { days: number; activeToday: boolean }; rank: { rank: number; total: number } | null }) {
  const answered = profile?.questionsAnswered ?? 0;
  const correct = profile?.questionsCorrect ?? 0;
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : null;
  const lv = levelProgress(profile?.xp ?? 0);
  return (
    <section aria-labelledby="snapshot-heading">
      <h2 id="snapshot-heading" className="sr-only">Your level and learning snapshot</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-3 h-full">
        {/* Level: your XP and how far to the next level (existing rule: 500 XP per level) */}
        <div className="col-span-2 rounded-2xl p-4 border" style={{ borderColor: "var(--amber-soft)", background: "linear-gradient(135deg, var(--amber-soft), #fff 78%)", boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center bg-white text-(--gold-deep)" aria-hidden><Star size={22} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-(--gold-deep)">Level {lv.number}</div>
              <div className="disp text-xl font-extrabold leading-tight">{lv.name}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="disp text-xl font-extrabold tabular-nums leading-tight">{lv.xp}</div>
              <div className="text-[11px] text-(--ink-soft)">XP</div>
            </div>
          </div>
          <div className="mt-3"><FoundationBar pct={lv.pct} tone="gold" height={8} label={lv.isMax ? "Top level reached" : `${lv.xpToNext} XP to ${lv.nextName}`} /></div>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-(--ink-soft)">
            <span>{lv.isMax ? "Top level reached" : <><b className="text-(--ink) tabular-nums">{lv.xpToNext} XP</b> to {lv.nextName}</>}</span>
            {rank && (
              <Link href="/leaderboard" className="font-semibold text-(--primary-deep) hover:underline inline-flex items-center gap-1 shrink-0 py-3 -my-3">
                <Trophy size={12} aria-hidden /> #{rank.rank} of {rank.total >= 50 ? "50+" : rank.total} in your grade
              </Link>
            )}
          </div>
        </div>
        <StatCard icon={<Flame size={18} />} tone="gold" label="Day streak" value={streak.days}
          hint={streak.activeToday ? "Active today" : streak.days > 0 ? "Learn today to keep it" : "Learn today to start one"} />
        <StatCard icon={<Target size={18} />} tone="blue" label="Overall accuracy" value={accuracy !== null ? `${accuracy}%` : "—"}
          hint={accuracy !== null ? `${correct} of ${answered} correct` : "Answer a question to see this"} />
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* Your mastery — topics the learner has actually mastered (or is strongest in) */
/* ---------------------------------------------------------------------- */

function YourMastery({ topics }: { topics: TopicMastery[] }) {
  const mastered = topics.filter((t) => t.masteryPct >= MASTERED).sort((a, b) => b.masteryPct - a.masteryPct);
  const strongest = topics.filter((t) => t.masteryPct > 0).sort((a, b) => b.masteryPct - a.masteryPct);
  const list = mastered.length > 0 ? mastered : strongest;
  if (list.length === 0) return null; // nothing real to show yet
  const shown = list.slice(0, 3);
  return (
    <Section id="mastery" title="Your mastery" description={mastered.length > 0 ? "Topics you've mastered." : "Your strongest topics so far."}
      action={list.length > shown.length ? <Button href="/progress" variant="ghost" size="sm">All topics <ArrowRight size={14} aria-hidden /></Button> : undefined}>
      <Card padding="none">
        <ul className="divide-y divide-(--stone-2)">
          {shown.map((t) => {
            const band = bandFor(t.masteryPct);
            return (
              <li key={t.id}>
                <Link href={`/learn/topic/${t.id}`} className="flex items-center gap-3 p-4 hover:bg-(--stone-2)">
                  <span className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center bg-(--green-soft) text-(--green)" aria-hidden>
                    {t.masteryPct >= MASTERED ? <CheckCircle2 size={18} /> : <Star size={18} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-sm truncate">{t.name}</span>
                    {t.subjectName && <span className="block text-xs text-(--ink-soft) truncate">{t.subjectName}</span>}
                    <span className="block mt-1.5 max-w-xs"><FoundationBar pct={t.masteryPct} tone={band.tone} height={6} label={`${t.name} mastery`} /></span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-bold tabular-nums">{t.masteryPct}%</span>
                    <Pill tone={band.tone}>{band.label}</Pill>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* Focus areas                                                              */
/* ---------------------------------------------------------------------- */

function topicLookup(curriculum: Load<Curriculum | null>) {
  const map = new Map<string, { subject: Subject; topic: RoadmapTopic }>();
  if (curriculum.status === "ready" && curriculum.data) {
    for (const subject of curriculum.data.subjects) for (const topic of curriculum.data.roadmaps[subject.id] ?? []) map.set(topic.id, { subject, topic });
  }
  return map;
}

function FocusAreas({ topics, curriculum }: { topics: TopicMastery[]; curriculum: Load<Curriculum | null> }) {
  const lookup = useMemo(() => topicLookup(curriculum), [curriculum]);
  const entries = [...topics].sort((a, b) => a.masteryPct - b.masteryPct);
  const toWork = entries.filter((t) => t.masteryPct < MASTERED);
  const strongCount = entries.length - toWork.length;
  const shown = toWork.slice(0, 4);

  return (
    <Section id="focus" title="Focus areas" description="Topics you've practised or been tested on, weakest first."
      action={entries.length > 0 ? <Button href="/progress" variant="ghost" size="sm">All topics <ArrowRight size={14} aria-hidden /></Button> : undefined}>
      <Card padding="none">
        {entries.length === 0 ? (
          <EmptyState compact icon={<Target size={22} />} title="No focus areas yet"
            description="Practise a topic or take a test, and Msingi will show you which topics need work."
            action={<Button href="/practice" size="sm">Start practising</Button>} />
        ) : shown.length === 0 ? (
          <EmptyState compact icon={<Trophy size={22} />} title={`All ${strongCount} topic${strongCount === 1 ? "" : "s"} you've worked on are Strong`}
            description="Try a test to check your understanding holds up."
            action={<Button href="/tests" size="sm" variant="secondary">Browse tests</Button>} />
        ) : (
          <>
            <ul className="divide-y divide-(--stone-2)">
              {shown.map(({ id, name, masteryPct: pct }) => {
                const band = bandFor(pct);
                const where = lookup.get(id);
                return (
                  <li key={id} className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/learn/topic/${id}`} className="font-semibold hover:text-(--primary-deep) hover:underline underline-offset-2 inline-block py-2 -my-2">{name}</Link>
                        <Pill tone={band.tone}>{band.label}</Pill>
                      </div>
                      {where && (
                        <div className="text-xs text-(--ink-soft) mt-0.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: subjectAccent(where.subject.name).color }} aria-hidden />
                          {where.subject.name}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 max-w-xs"><FoundationBar pct={pct} tone={band.tone} height={6} label={`${name} mastery`} /></div>
                        <span className="text-xs font-semibold tabular-nums">{pct}%</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {where?.topic.lessonId && (
                        <Button href={`/learn/lesson/${where.topic.lessonId}`} variant="secondary" size="sm" aria-label={`Review the ${name} lesson`}>
                          <BookOpen size={14} aria-hidden /> Lesson
                        </Button>
                      )}
                      <Button href={practiceHref({ id, name })} size="sm" aria-label={`Practise ${name}`}>
                        <Dumbbell size={14} aria-hidden /> Practise
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {(toWork.length > shown.length || strongCount > 0) && (
              <p className="px-5 py-3 text-xs text-(--ink-soft) border-t border-(--stone-2)">
                {toWork.length > shown.length && <>{toWork.length - shown.length} more to work on. </>}
                {strongCount > 0 && <>{strongCount} topic{strongCount === 1 ? " is" : "s are"} Strong.</>}
              </p>
            )}
          </>
        )}
      </Card>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* Recommended next                                                         */
/* ---------------------------------------------------------------------- */

type Rec = { key: string; icon: React.ReactNode; title: string; reason: string; href: string; cta: string };

function RecommendedNext({ progress, curriculum, challenge, onRetryChallenge }: {
  progress: ProgressResponse; curriculum: Load<Curriculum | null>; challenge: Load<Challenge>; onRetryChallenge: () => void;
}) {
  // A test recommendation needs one extra request: the published tests for
  // the subject the learner is most likely to be working in (their weakest
  // focus topic's subject, else their continue-learning subject).
  const lookup = useMemo(() => topicLookup(curriculum), [curriculum]);
  const targetSubject = useMemo(() => {
    const weakest = progress.topics.filter((t) => t.masteryPct < MASTERED).sort((a, b) => a.masteryPct - b.masteryPct)[0];
    const fromFocus = weakest ? lookup.get(weakest.id)?.subject : undefined;
    if (fromFocus) return fromFocus;
    return curriculum.status === "ready" && curriculum.data ? pickContinue(curriculum.data).pick?.subject ?? null : null;
  }, [progress.topics, lookup, curriculum]);

  const [tests, setTests] = useState<Load<Test[]> | null>(null);
  useEffect(() => {
    if (!targetSubject) return;
    let cancelled = false;
    getJson<{ tests: Test[] }>(`/api/tests?subjectId=${targetSubject.id}`)
      .then((d) => { if (!cancelled) setTests({ status: "ready", data: d.tests ?? [] }); })
      .catch(() => { if (!cancelled) setTests({ status: "error" }); });
    return () => { cancelled = true; };
  }, [targetSubject]);

  const recs: Rec[] = [];
  if (progress.openMistakeCount > 0) {
    const n = progress.openMistakeCount;
    recs.push({ key: "mistakes", icon: <BookMarked size={18} />, title: "Review your mistakes", href: "/mistakes", cta: "Review",
      reason: `${n} question${n === 1 ? "" : "s"} you got wrong ${n === 1 ? "is" : "are"} saved in your Mistake Book.` });
  }
  if (targetSubject && tests?.status === "ready") {
    // testHistory is newest-first, so the first match is the latest attempt.
    const latestScore = (testId: string) => progress.testHistory.find((t) => t.testId === testId)?.score;
    const untaken = tests.data.find((t) => latestScore(t.id) === undefined);
    const toRetake = tests.data
      .map((t) => ({ t, score: latestScore(t.id) }))
      .filter((x): x is { t: Test; score: number } => x.score !== undefined && x.score < x.t.passingThreshold)
      .sort((a, b) => a.score - b.score)[0];
    if (toRetake) {
      recs.push({ key: "retake", icon: <ClipboardCheck size={18} />, title: `Retake ${toRetake.t.title}`, href: `/tests/${toRetake.t.id}`, cta: "Retake",
        reason: `Your latest score was ${toRetake.score}% — the pass mark is ${toRetake.t.passingThreshold}%.` });
    } else if (untaken) {
      recs.push({ key: "test", icon: <ClipboardCheck size={18} />, title: `Take ${untaken.title}`, href: `/tests/${untaken.id}`, cta: "Start",
        reason: `You haven't taken this ${targetSubject.name} test yet.` });
    }
  }
  if (challenge.status === "ready" && !challenge.data.completed) {
    const c = challenge.data;
    recs.push({ key: "challenge", icon: <Zap size={18} />, title: "Today's challenge", href: "/practice", cta: "Practise",
      reason: `Answer ${c.targetCount} practice questions in a row correctly for +100 XP. You're on ${c.correctStreak} of ${c.targetCount}.` });
  }

  const loading = challenge.status === "loading" || curriculum.status === "loading" || (targetSubject !== null && tests === null);

  return (
    <Section id="recommended" title="Recommended next" description="Based on your mistakes, tests and today's challenge.">
      <Card padding="none">
        {loading && recs.length === 0 ? (
          <LoadingState label="Loading recommendations">
            <div className="p-4 space-y-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
          </LoadingState>
        ) : recs.length === 0 ? (
          <EmptyState compact icon={<CheckCircle2 size={22} />} title="Nothing else waiting"
            description="No saved mistakes or pending tests. Keep going with your current topic." />
        ) : (
          <ul className="divide-y divide-(--stone-2)">
            {recs.map((r) => (
              <li key={r.key} className="p-4 flex items-start gap-3">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-(--primary-soft) text-(--primary-deep)" aria-hidden>{r.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm">{r.title}</div>
                  <p className="text-xs text-(--ink-soft) mt-0.5">{r.reason}</p>
                </div>
                <Button href={r.href} size="sm" variant="secondary" className="shrink-0" aria-label={`${r.cta}: ${r.title}`}>{r.cta}</Button>
              </li>
            ))}
          </ul>
        )}
        {challenge.status === "ready" && challenge.data.completed && (
          <p className="px-4 py-3 text-xs font-semibold text-(--green) border-t border-(--stone-2) flex items-center gap-1.5">
            <CheckCircle2 size={14} aria-hidden /> Today&apos;s challenge is complete.
          </p>
        )}
        {(challenge.status === "error" || tests?.status === "error") && (
          <div className="px-4 py-3 text-xs text-(--ink-soft) border-t border-(--stone-2) flex items-center justify-between gap-2" role="alert">
            <span>Some recommendations couldn&apos;t be loaded.</span>
            {challenge.status === "error" && <button type="button" onClick={onRetryChallenge} className="font-semibold text-(--primary-deep) underline">Retry</button>}
          </div>
        )}
      </Card>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* My subjects                                                              */
/* ---------------------------------------------------------------------- */

function MySubjects({ curriculum, subjectMastery, gradeName, onRetry }: {
  curriculum: Load<Curriculum | null>; subjectMastery: Record<string, number>; gradeName: string | null; onRetry: () => void;
}) {
  if (!gradeName) return null; // Continue Learning already explains the missing grade.
  return (
    <Section id="subjects" title="My subjects" description={`Your ${gradeName} subjects. Test mastery updates each time you take a test.`}>
      {curriculum.status === "loading" ? (
        <LoadingState label="Loading your subjects">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        </LoadingState>
      ) : curriculum.status === "error" ? (
        <Card><ErrorState compact title="We couldn't load your subjects" onRetry={onRetry} /></Card>
      ) : !curriculum.data || curriculum.data.subjects.length === 0 ? (
        <Card><EmptyState compact icon={<Layers size={22} />} title="No subjects yet" description={`Subjects for ${gradeName} haven't been set up yet.`} /></Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {curriculum.data.subjects.map((s) => {
            const topics = curriculum.data!.roadmaps[s.id] ?? [];
            const mastered = topics.filter((t) => t.masteryPct >= MASTERED).length;
            const current = topics.find((t) => t.masteryPct > 0 && t.masteryPct < MASTERED);
            const testMastery = subjectMastery[s.id];
            const accent = subjectAccent(s.name);
            return (
              <li key={s.id}>
                <Link href={`/learn?subjectId=${s.id}`} className="group block h-full rounded-2xl">
                  <Card interactive padding="sm" className="h-full group-hover:border-(--primary)">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: accent.color }} aria-hidden />
                          <h3 className="font-bold truncate">{s.name}</h3>
                        </div>
                        <p className="text-xs text-(--ink-soft) mt-1.5">
                          {topics.length === 0 ? "No topics yet" : `${mastered} of ${topics.length} topic${topics.length === 1 ? "" : "s"} mastered`}
                        </p>
                        {current && <p className="text-xs mt-1 truncate"><span className="text-(--ink-soft)">Working on:</span> <b>{current.name}</b></p>}
                      </div>
                      {testMastery !== undefined ? (
                        <div className="text-center shrink-0">
                          <ProgressRing pct={testMastery} size={52} stroke={5} tone={bandFor(testMastery).tone} label={`${s.name} test mastery`}>
                            <span className="text-xs font-bold">{testMastery}%</span>
                          </ProgressRing>
                          <div className="text-[10px] text-(--ink-soft) mt-0.5">Test mastery</div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-(--ink-soft) shrink-0 text-right leading-tight">No test<br />taken yet</span>
                      )}
                    </div>
                    {topics.length > 0 && (
                      <div className="mt-3"><FoundationBar pct={(mastered / topics.length) * 100} tone="green" height={5} label={`${s.name} topics mastered`} /></div>
                    )}
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* Recent progress                                                          */
/* ---------------------------------------------------------------------- */

function RecentProgress({ progress }: { progress: ProgressResponse }) {
  const recent = progress.testHistory.slice(0, 3);
  const unlocked = progress.achievements.unlocked.length;
  const total = progress.achievements.all.length;
  return (
    <Section id="recent" title="Recent tests"
      action={<Button href="/progress" variant="ghost" size="sm">View progress <ArrowRight size={14} aria-hidden /></Button>}>
      <Card padding="none">
        {recent.length === 0 ? (
          <EmptyState compact icon={<ClipboardCheck size={22} />} title="No tests taken yet"
            description="Tests show how well you understand a subject, topic by topic."
            action={<Button href="/tests" size="sm" variant="secondary">Browse tests</Button>} />
        ) : (
          <ul className="divide-y divide-(--stone-2)">
            {recent.map((t, i) => (
              <li key={i} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{t.testTitle}</div>
                  <div className="text-xs text-(--ink-soft)">{new Date(t.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</div>
                </div>
                <span className="font-bold tabular-nums">{t.score}%</span>
              </li>
            ))}
          </ul>
        )}
        {total > 0 && (
          <Link href="/progress#achievements" className="px-4 sm:px-5 py-3 text-xs font-semibold border-t border-(--stone-2) flex items-center gap-2 text-(--ink-soft) hover:text-(--ink)">
            <Trophy size={14} className="text-(--gold-deep)" aria-hidden /> {unlocked} of {total} achievements unlocked
          </Link>
        )}
      </Card>
    </Section>
  );
}

/* ---------------------------------------------------------------------- */
/* Skeleton                                                                 */
/* ---------------------------------------------------------------------- */

function DashboardSkeleton() {
  return (
    <LoadingState label="Loading your dashboard">
      <div className="space-y-8">
        <div className="space-y-2"><Skeleton className="h-8 w-64 max-w-full" /><Skeleton className="h-4 w-80 max-w-full" /></div>
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-56 rounded-2xl xl:col-span-2" />
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl xl:col-span-2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </LoadingState>
  );
}
