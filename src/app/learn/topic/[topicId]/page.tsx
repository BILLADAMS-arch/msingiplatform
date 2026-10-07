"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Breadcrumbs, Button, Card, EmptyState, ErrorState, FoundationBar, LoadingState, Pill, ProgressRing, Skeleton, type Tone } from "@/components/ui";
import { subjectAccent } from "@/lib/subject-colors";
import { bandFor } from "@/lib/mastery";
import { practiceHref } from "@/lib/links";
import { nextAction, type TopicHubData } from "@/lib/topic-hub";
import { BookOpen, Dumbbell, Layers, BookMarked, ClipboardCheck, ArrowRight, ArrowLeft, CheckCircle2, Compass, Hourglass, Trophy } from "lucide-react";

type Load = { status: "loading" } | { status: "notfound" } | { status: "error" } | { status: "ready"; data: TopicHubData };
type OutlineTopic = { id: string; name: string; order: number; masteryPct: number };

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** One way of working with the topic. A link when it can be used, a quiet note when it can't yet. */
function ModeTile({ icon, title, status, detail, href, tone = "blue" }: { icon: ReactNode; title: string; status: string; detail?: string; href: string | null; tone?: Tone }) {
  const chip: Record<Tone, string> = { blue: "bg-(--primary-soft) text-(--primary-deep)", green: "bg-(--green-soft) text-(--green)", gold: "bg-(--amber-soft) text-(--gold-deep)", coral: "bg-(--coral-soft) text-(--coral)", warning: "bg-(--warning-soft) text-(--warning)" };
  const body = (
    <>
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${chip[tone]}`} aria-hidden>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-sm">{title}</span>
        <span className="block text-xs font-semibold text-(--ink-soft) mt-0.5">{status}</span>
        {detail && <span className="block text-xs text-(--ink-soft) mt-0.5">{detail}</span>}
      </span>
    </>
  );
  const base = "flex items-start gap-3 rounded-2xl border p-4 min-h-24 bg-white";
  return href ? (
    <Link href={href} className={`${base} tap hover:border-(--primary) transition-colors`} style={{ borderColor: "var(--slate)", boxShadow: "var(--shadow-card)" }}>{body}</Link>
  ) : (
    <div className={`${base} opacity-60`} style={{ borderColor: "var(--slate)" }} aria-disabled>{body}</div>
  );
}

function TopicHub() {
  const { topicId } = useParams<{ topicId: string }>();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [outline, setOutline] = useState<OutlineTopic[] | null>(null);

  const fetchTopic = useCallback(() => {
    fetch(`/api/topics/${topicId}`)
      .then(async (r) => {
        if (r.status === 404 || r.status === 400) return setLoad({ status: "notfound" });
        if (!r.ok) throw new Error(String(r.status));
        setLoad({ status: "ready", data: await r.json() });
      })
      .catch(() => setLoad({ status: "error" }));
  }, [topicId]);
  useEffect(() => { fetchTopic(); }, [fetchTopic]);

  // Larger screens also show the subject's topic outline (existing roadmap API).
  const subjectId = load.status === "ready" ? load.data.breadcrumb.subjectId : null;
  useEffect(() => {
    if (!subjectId) return;
    let cancelled = false;
    fetch(`/api/curriculum/roadmap?subjectId=${subjectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { roadmap?: OutlineTopic[] } | null) => { if (!cancelled && d?.roadmap) setOutline([...d.roadmap].sort((a, b) => a.order - b.order)); })
      .catch(() => { /* the outline is optional */ });
    return () => { cancelled = true; };
  }, [subjectId]);

  if (load.status === "loading") {
    return <Shell><LoadingState label="Loading topic"><div className="max-w-5xl space-y-4"><Skeleton className="h-6 w-56" /><Skeleton className="h-52 rounded-3xl" /><div className="grid grid-cols-2 gap-3"><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /></div></div></LoadingState></Shell>;
  }
  if (load.status === "notfound") {
    return <Shell><Card className="max-w-md mx-auto"><EmptyState icon={<Compass size={22} />} title="We couldn't find that topic" description="It may have moved or been removed." action={<Button href="/learn">Back to Learn</Button>} /></Card></Shell>;
  }
  if (load.status === "error") {
    return <Shell><Card className="max-w-md mx-auto"><ErrorState title="We couldn't load this topic" onRetry={() => { setLoad({ status: "loading" }); fetchTopic(); }} /></Card></Shell>;
  }

  const d = load.data;
  const accent = subjectAccent(d.breadcrumb.subject);
  const action = nextAction(d);
  const band = bandFor(d.mastery.pct);
  const started = d.mastery.pct > 0 || d.mastery.answered > 0;
  const bandLabel = started ? band.label : "Not started";
  const bandTone: Tone = started ? band.tone : "blue";
  const hasQuestions = d.practice.questionCount > 0;
  const hasCards = d.flashcards.count > 0;
  const subjectHref = `/learn?subjectId=${d.breadcrumb.subjectId}`;

  return (
    <Shell>
      <div className="fade-in max-w-5xl space-y-5">
        <Breadcrumbs items={[
          { label: "Learn", href: "/learn" },
          { label: d.breadcrumb.subject, href: subjectHref },
          { label: d.topic.name },
        ]} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="space-y-5 min-w-0">
            {/* Where you are + what to do next */}
            <Card padding="lg" style={{ borderColor: accent.soft, background: `linear-gradient(135deg, ${accent.soft}, #fff 72%)` }}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: accent.color }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accent.color }} aria-hidden /> {d.breadcrumb.grade} · {d.breadcrumb.subject}
                  </div>
                  <h1 className="disp text-3xl font-bold mt-1 leading-tight break-words">{d.topic.name}</h1>
                  <p className="text-xs text-(--ink-soft) mt-1">Topic {d.topic.position} of {d.topic.total}</p>
                  <div className="mt-2.5"><Pill tone={bandTone}>{bandLabel}</Pill></div>
                </div>
                <ProgressRing pct={d.mastery.pct} size={92} stroke={9} tone={bandTone === "blue" ? "blue" : bandTone} label={`Mastery ${d.mastery.pct} percent`}>
                  <div><div className="disp text-xl leading-none">{d.mastery.pct}%</div><div className="text-[10px] text-(--ink-soft) mt-0.5">mastery</div></div>
                </ProgressRing>
              </div>

              <div className="mt-5 rounded-2xl bg-white/80 border p-4" style={{ borderColor: accent.soft }}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-(--ink-soft)">Next step</div>
                <p className="text-sm mt-1">{action.reason}</p>
                {action.href ? (
                  <Button href={action.href} size="lg" full className="mt-3 sm:w-auto">
                    {action.label} <ArrowRight size={18} aria-hidden />
                  </Button>
                ) : (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-(--ink-soft)"><Hourglass size={16} aria-hidden /> {action.label}</p>
                )}
              </div>
            </Card>

            {/* Ways to work with this topic */}
            <section aria-labelledby="modes-h">
              <h2 id="modes-h" className="disp text-lg font-bold mb-3">Learn this topic</h2>
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
                <ModeTile icon={<BookOpen size={20} />} title="Lesson"
                  status={!d.lesson ? "Coming soon" : d.lesson.completed ? "Completed" : "Not completed yet"}
                  detail={d.lesson ? d.lesson.title : undefined} tone={d.lesson?.completed ? "green" : "blue"}
                  href={d.lesson ? `/learn/lesson/${d.lesson.id}` : null} />
                <ModeTile icon={<Dumbbell size={20} />} title="Practise"
                  status={hasQuestions ? `${d.practice.questionCount} ${plural(d.practice.questionCount, "question", "questions")}` : "No questions yet"}
                  detail={hasQuestions ? `Mastery ${d.mastery.pct}%` : undefined} tone="blue"
                  href={hasQuestions ? practiceHref({ id: d.topic.id, name: d.topic.name }) : null} />
                <ModeTile icon={<Layers size={20} />} title="Flashcards"
                  status={hasCards ? `${d.flashcards.count} ${plural(d.flashcards.count, "card", "cards")}` : "No flashcards yet"}
                  detail={hasCards ? `${d.flashcards.reviewed} reviewed` : undefined} tone="gold"
                  href={hasCards ? `/flashcards?topicId=${d.topic.id}` : null} />
                <ModeTile icon={<BookMarked size={20} />} title="Mistakes"
                  status={d.mistakes.open > 0 ? `${d.mistakes.open} to master` : "None open"}
                  detail={d.mistakes.open > 0 ? "Review and master them" : started ? "Nothing to revise here" : undefined}
                  tone={d.mistakes.open > 0 ? "coral" : "green"}
                  href={d.mistakes.open > 0 ? `/mistakes?topicId=${d.topic.id}` : null} />
              </div>
            </section>

            {/* Check what you know */}
            <section aria-labelledby="assess-h">
              <h2 id="assess-h" className="disp text-lg font-bold mb-3">Check what you know</h2>
              <Card padding="none">
                <ul className="divide-y divide-(--stone-2)">
                  <li className="p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm flex items-center gap-2"><Dumbbell size={16} className="text-(--primary)" aria-hidden /> Practice on {d.topic.name}</div>
                      <div className="text-xs text-(--ink-soft) mt-0.5">{hasQuestions ? "Questions adapt to how you're doing." : "Practice questions for this topic aren't available yet."}</div>
                    </div>
                    {hasQuestions && <Button href={practiceHref({ id: d.topic.id, name: d.topic.name })} size="md" variant="secondary">Take practice</Button>}
                  </li>
                  {d.tests.length === 0 ? (
                    <li className="p-4 text-sm text-(--ink-soft) flex items-center gap-2"><ClipboardCheck size={16} aria-hidden /> No test covers this topic yet.</li>
                  ) : d.tests.map((t) => {
                    const passed = t.latestScore !== null && t.latestScore >= t.passingThreshold;
                    return (
                      <li key={t.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm flex items-center gap-2"><ClipboardCheck size={16} className="text-(--primary)" aria-hidden /> <span className="break-words">{t.title}</span></div>
                          <div className="text-xs text-(--ink-soft) mt-0.5 flex items-center gap-2 flex-wrap">
                            {t.questionsOnTopic} {plural(t.questionsOnTopic, "question", "questions")} on this topic
                            {t.latestScore === null ? <Pill tone="blue">Not taken yet</Pill> : <Pill tone={passed ? "green" : "coral"}>{passed ? <Trophy size={12} aria-hidden /> : null} Last score {t.latestScore}%</Pill>}
                          </div>
                        </div>
                        <Button href={`/tests/${t.id}`} size="md" variant={t.latestScore === null ? "primary" : "secondary"}>{t.latestScore === null ? "Take test" : "Retest"}</Button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </section>

            {/* Where next */}
            <nav aria-label="Topic navigation" className="grid gap-3 sm:grid-cols-2">
              {d.previous ? (
                <Link href={`/learn/topic/${d.previous.id}`} className="tap rounded-2xl border bg-white p-4 flex items-center gap-3 min-h-16 hover:border-(--primary)" style={{ borderColor: "var(--slate)" }}>
                  <ArrowLeft size={18} className="text-(--ink-soft) shrink-0" aria-hidden />
                  <span className="min-w-0"><span className="block text-[11px] font-bold uppercase tracking-wider text-(--ink-soft)">Previous topic</span><span className="block font-semibold text-sm break-words">{d.previous.name}</span></span>
                </Link>
              ) : <span className="hidden sm:block" />}
              {d.next ? (
                <Link href={`/learn/topic/${d.next.id}`} className="tap rounded-2xl border bg-white p-4 flex items-center justify-between gap-3 min-h-16 hover:border-(--primary) text-right" style={{ borderColor: "var(--slate)" }}>
                  <span className="min-w-0"><span className="block text-[11px] font-bold uppercase tracking-wider text-(--ink-soft)">Next topic</span><span className="block font-semibold text-sm break-words">{d.next.name}</span></span>
                  <ArrowRight size={18} className="text-(--ink-soft) shrink-0" aria-hidden />
                </Link>
              ) : null}
            </nav>
          </div>

          {/* Progress (always) + subject outline (large screens) */}
          <aside className="space-y-5 min-w-0" aria-label="Topic progress">
            <Card>
              <h2 className="disp text-base font-bold">Your progress</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3"><dt className="text-(--ink-soft)">Lessons completed</dt><dd className="font-semibold tabular-nums">{d.lesson?.completed ? 1 : 0} of {d.lesson ? 1 : 0}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-(--ink-soft)">Questions answered</dt><dd className="font-semibold tabular-nums">{d.mastery.answered}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-(--ink-soft)">Mistakes to master</dt><dd className="font-semibold tabular-nums">{d.mistakes.open}</dd></div>
                {hasCards && <div className="flex items-center justify-between gap-3"><dt className="text-(--ink-soft)">Flashcards reviewed</dt><dd className="font-semibold tabular-nums">{d.flashcards.reviewed} of {d.flashcards.count}</dd></div>}
                <div>
                  <div className="flex items-center justify-between gap-3 mb-1.5"><dt className="text-(--ink-soft)">Mastery</dt><dd className="font-semibold tabular-nums">{d.mastery.pct}%</dd></div>
                  <FoundationBar pct={d.mastery.pct} tone={bandTone} height={8} label={`${d.topic.name} mastery`} />
                </div>
              </dl>
            </Card>

            {outline && outline.length > 1 && (
              <Card className="hidden lg:block">
                <h2 className="disp text-base font-bold">In {d.breadcrumb.subject}</h2>
                <ol className="mt-3 space-y-1">
                  {outline.map((t, i) => {
                    const here = t.id === d.topic.id;
                    return (
                      <li key={t.id}>
                        <Link href={`/learn/topic/${t.id}`} aria-current={here ? "page" : undefined}
                          className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm ${here ? "font-bold" : "hover:bg-(--stone-2)"}`}
                          style={here ? { background: accent.soft, color: accent.color } : undefined}>
                          <span className="w-5 text-xs tabular-nums text-(--ink-soft)">{i + 1}</span>
                          <span className="min-w-0 flex-1 truncate">{t.name}</span>
                          {t.masteryPct >= 70 ? <CheckCircle2 size={14} className="text-(--green) shrink-0" aria-label="Strong" /> : t.masteryPct > 0 ? <span className="text-xs tabular-nums text-(--ink-soft)">{t.masteryPct}%</span> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </Shell>
  );
}

export default function TopicHubPage() { return <TopicHub />; }
