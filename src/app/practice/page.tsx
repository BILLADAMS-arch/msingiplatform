"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Button, Card, Pill, FoundationBar, EmptyState, ErrorState, Skeleton, LoadingState, ProgressRing } from "@/components/ui";
import { AnswerOptions, AnswerInput, AnswerFeedback } from "@/components/question";
import { Dumbbell, Trophy, ArrowRight, BookMarked, RotateCcw, ClipboardCheck, CheckCircle2, Sparkles } from "lucide-react";

type PracticeQuestion = { attemptKey: string; id: string; type: string; prompt: string; difficulty: string; options: { id: string; label: string }[] };
type CheckResult = { isCorrect: boolean; correctOptionId?: string; correctLabel: string; explanation: string };
type TopicRef = { id: string | null; name: string | null };

const COUNTS = [5, 10, 20];
const DIFFICULTY_TONE = { easy: "green", medium: "gold", hard: "coral" } as const;

function PracticeInner() {
  const params = useSearchParams();
  const requested: TopicRef = { id: params.get("topicId"), name: params.get("topic") };
  const hasRequested = !!(requested.id || requested.name);

  // No topic given (e.g. opened from the nav) — pick a real one: the
  // learner's weakest in-progress topic, else the first topic with a lesson
  // in their first subject. Same rule as before; nothing is hardcoded.
  const [fallback, setFallback] = useState<{ status: "idle" | "searching" | "none" | "error"; topic?: TopicRef }>({ status: hasRequested ? "idle" : "searching" });
  useEffect(() => {
    if (hasRequested) return;
    (async () => {
      const p = await fetch("/api/progress/me").then((r) => { if (!r.ok) throw new Error(); return r.json(); });
      const weakest = Object.entries(p.topicMastery as Record<string, number>).filter(([, v]) => v > 0 && v < 70).sort((a, b) => a[1] - b[1])[0];
      if (weakest) return setFallback({ status: "idle", topic: { id: null, name: weakest[0] } });
      const profile = await fetch("/api/profile").then((r) => r.json());
      if (!profile.gradeName) return setFallback({ status: "none" });
      const subjRes = await fetch(`/api/curriculum/subjects?grade=${encodeURIComponent(profile.gradeName)}`).then((r) => r.json());
      const firstSubject = subjRes.subjects?.[0];
      if (!firstSubject) return setFallback({ status: "none" });
      const roadmap = await fetch(`/api/curriculum/roadmap?subjectId=${firstSubject.id}`).then((r) => r.json());
      const firstTopic = roadmap.roadmap?.find((t: { lessonId: string | null }) => t.lessonId);
      setFallback(firstTopic ? { status: "idle", topic: { id: firstTopic.id, name: firstTopic.name } } : { status: "none" });
    })().catch(() => setFallback({ status: "error" }));
  }, [hasRequested]);

  const topic: TopicRef | null = hasRequested ? requested : fallback.topic ?? null;

  const [count, setCount] = useState(10);
  const [session, setSession] = useState<{ status: "setup" } | { status: "loading" } | { status: "error"; notFound?: boolean } | { status: "ready"; topicName: string; topicId: string; questions: PracticeQuestion[] }>({ status: "setup" });
  const [qIdx, setQIdx] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [checking, setChecking] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);

  async function start() {
    if (!topic) return;
    setSession({ status: "loading" });
    setQIdx(0); setCorrectCount(0); setChosen(null); setFreeText(""); setResult(null);
    const qs = new URLSearchParams({ count: String(count) });
    if (topic.id) qs.set("topicId", topic.id); else if (topic.name) qs.set("topic", topic.name);
    try {
      const res = await fetch(`/api/practice?${qs.toString()}`);
      if (res.status === 404) return setSession({ status: "error", notFound: true });
      if (!res.ok) throw new Error();
      const body = await res.json();
      setSession({ status: "ready", topicName: body.topic, topicId: body.topicId, questions: body.questions ?? [] });
    } catch {
      setSession({ status: "error" });
    }
  }

  // Ref guard: a double click/Enter must not grade (and award XP for) the same answer twice.
  const checkingRef = useRef(false);
  async function submit() {
    if (session.status !== "ready" || checkingRef.current || result) return;
    const q = session.questions[qIdx];
    const isFree = q.type === "numerical" || q.type === "short_answer";
    if (isFree ? !freeText.trim() : !chosen) return;
    checkingRef.current = true;
    setChecking(true);
    setSubmitError(false);
    try {
      const res = await fetch("/api/practice/attempts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: q.id,
          ...(q.type === "numerical" ? { answerNumeric: Number(freeText) } : q.type === "short_answer" ? { answerText: freeText } : { chosenOptionId: chosen }),
        }),
      });
      if (!res.ok) throw new Error();
      const body: CheckResult = await res.json();
      setResult(body);
      if (body.isCorrect) setCorrectCount((c) => c + 1);
      requestAnimationFrame(() => nextRef.current?.focus());
    } catch {
      setSubmitError(true);
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }

  function next() { setChosen(null); setFreeText(""); setResult(null); setSubmitError(false); setQIdx((i) => i + 1); window.scrollTo({ top: 0 }); }

  const displayName = session.status === "ready" ? session.topicName : topic?.name ?? null;

  /* -------- Choosing a topic / setup -------- */
  if (session.status === "setup") {
    if (!topic) {
      return (
        <Shell>
          <Card className="max-w-lg mx-auto">
            {fallback.status === "error" ? (
              <ErrorState title="We couldn't find something to practise" onRetry={() => window.location.reload()} />
            ) : fallback.status === "none" ? (
              <EmptyState icon={<Dumbbell size={22} />} title="Nothing to practise yet"
                description="Open a topic from Learn to start practising it." action={<Button href="/learn">Go to Learn</Button>} />
            ) : (
              <LoadingState label="Finding something for you to practise"><div className="p-6 space-y-3"><Skeleton className="h-8 w-2/3 mx-auto" /><Skeleton className="h-12" /></div></LoadingState>
            )}
          </Card>
        </Shell>
      );
    }
    return (
      <Shell>
        <div className="fade-in max-w-lg mx-auto">
          <Card padding="lg">
            <form onSubmit={(e) => { e.preventDefault(); start(); }} className="text-center space-y-6">
              <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center bg-(--primary-soft) text-(--primary-deep)" aria-hidden><Dumbbell size={22} /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-(--ink-soft)">Practice</p>
                <h1 className="disp text-2xl sm:text-3xl mt-1">{displayName ? `Practise ${displayName}` : "Practise this topic"}</h1>
                <p className="text-sm text-(--ink-soft) mt-2">You&apos;ll get feedback and an explanation after every answer. Questions adapt to your current mastery.</p>
              </div>
              <fieldset>
                <legend className="text-sm font-semibold mb-2.5">How many questions?</legend>
                <div className="flex flex-wrap justify-center gap-2">
                  {COUNTS.map((c) => (
                    <label key={c} className={`tap min-h-11 px-4 inline-flex items-center rounded-full border text-sm font-semibold cursor-pointer has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-(--primary) ${count === c ? "bg-(--primary) border-(--primary) text-white" : "bg-white border-(--slate) hover:border-(--primary)"}`}>
                      <input type="radio" name="count" value={c} checked={count === c} onChange={() => setCount(c)} className="sr-only" />
                      {c} questions
                    </label>
                  ))}
                </div>
              </fieldset>
              <Button type="submit" size="lg" full>Start practice <ArrowRight size={18} aria-hidden /></Button>
            </form>
          </Card>
        </div>
      </Shell>
    );
  }

  if (session.status === "loading") {
    return (
      <Shell>
        <LoadingState label="Loading questions">
          <div className="max-w-2xl mx-auto space-y-4"><Skeleton className="h-5 w-40" /><Skeleton className="h-2" /><Skeleton className="h-72 rounded-2xl" /></div>
        </LoadingState>
      </Shell>
    );
  }

  if (session.status === "error") {
    return (
      <Shell>
        <Card className="max-w-lg mx-auto">
          {session.notFound ? (
            <EmptyState icon={<Dumbbell size={22} />} title="We couldn't find that topic" description="It may have been renamed or removed." action={<Button href="/learn">Go to Learn</Button>} />
          ) : (
            <ErrorState title="We couldn't load practice questions" onRetry={start} />
          )}
        </Card>
      </Shell>
    );
  }

  const { questions } = session;
  if (questions.length === 0) {
    return (
      <Shell>
        <Card className="max-w-lg mx-auto">
          <EmptyState icon={<Dumbbell size={22} />} title={`No practice questions for ${session.topicName} yet`}
            description="Questions for this topic haven't been added. Try another topic from Learn." action={<Button href="/learn">Go to Learn</Button>} />
        </Card>
      </Shell>
    );
  }

  /* -------- Summary -------- */
  if (qIdx >= questions.length) {
    const pct = Math.round((correctCount / questions.length) * 100);
    const wrong = questions.length - correctCount;
    return (
      <Shell>
        <div className="fade-in max-w-lg mx-auto">
          <Card padding="lg" className="text-center">
            <Trophy size={28} className="mx-auto text-(--gold-deep)" aria-hidden />
            <h1 className="disp text-2xl sm:text-3xl mt-2">Practice complete</h1>
            <p className="text-sm text-(--ink-soft) mt-1">{session.topicName}</p>
            <div className="mt-5 flex justify-center">
              <ProgressRing pct={pct} size={120} tone={pct >= 70 ? "green" : pct >= 50 ? "gold" : "coral"} label={`${correctCount} of ${questions.length} correct`}>
                <div><div className="disp text-2xl">{correctCount}/{questions.length}</div><div className="text-[11px] text-(--ink-soft)">correct</div></div>
              </ProgressRing>
            </div>
            {wrong > 0 && <p className="text-sm text-(--ink-soft) mt-4">{wrong} question{wrong === 1 ? " you missed is" : "s you missed are"} saved in your Mistake Book.</p>}
            <div className="grid gap-2.5 mt-6">
              <Button size="lg" onClick={start}><RotateCcw size={16} aria-hidden /> Practise {session.topicName} again</Button>
              {wrong > 0 && <Button size="lg" variant="secondary" href="/mistakes"><BookMarked size={16} aria-hidden /> Review mistakes</Button>}
              <Button size="lg" variant="secondary" href="/tests"><ClipboardCheck size={16} aria-hidden /> Test yourself</Button>
              <Button size="lg" variant="ghost" href="/dashboard">Back to dashboard</Button>
            </div>
          </Card>
        </div>
      </Shell>
    );
  }

  /* -------- Question -------- */
  const q = questions[qIdx];
  const isFree = q.type === "short_answer" || q.type === "numerical";
  const canCheck = isFree ? !!freeText.trim() : !!chosen;
  const last = qIdx === questions.length - 1;
  return (
    <Shell>
      <div className="fade-in max-w-2xl mx-auto space-y-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-(--ink-soft) truncate">Practice · {session.topicName}</p>
            <span className="text-xs font-semibold text-(--ink-soft) shrink-0 flex items-center gap-1"><CheckCircle2 size={14} className="text-(--green)" aria-hidden />{correctCount} correct</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1"><FoundationBar pct={((qIdx + (result ? 1 : 0)) / questions.length) * 100} height={8} label="Practice progress" /></div>
            <span className="text-xs font-semibold tabular-nums">{qIdx + 1}/{questions.length}</span>
          </div>
        </div>

        <Card padding="lg">
          <form onSubmit={(e) => { e.preventDefault(); if (result) next(); else submit(); }} className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <h1 className="font-semibold text-lg leading-snug">
                <span className="sr-only">Question {qIdx + 1} of {questions.length}: </span>{q.prompt}
              </h1>
              <Pill tone={DIFFICULTY_TONE[q.difficulty as keyof typeof DIFFICULTY_TONE] ?? "blue"}>{q.difficulty}</Pill>
            </div>

            {isFree ? (
              <AnswerInput id={`answer-${q.attemptKey}`} type={q.type as "short_answer" | "numerical"} value={freeText} onChange={setFreeText}
                disabled={!!result || checking} result={result ? (result.isCorrect ? "correct" : "wrong") : undefined} />
            ) : (
              <AnswerOptions key={q.attemptKey} name={`q-${q.attemptKey}`} legend={q.prompt} options={q.options} value={chosen} onChange={setChosen}
                disabled={!!result || checking} reveal={result ? { correctId: result.correctOptionId, chosenId: chosen } : undefined} />
            )}

            {result && (
              <AnswerFeedback correct={result.isCorrect} correctLabel={result.correctLabel} explanation={result.explanation}>
                {!result.isCorrect && (
                  // Pre-fills Ask Msingi with this question so the learner can review and send it.
                  <Link href={`/ai?prompt=${encodeURIComponent(
                    `I got this ${session.topicName} practice question wrong: "${q.prompt}". I answered "${isFree ? freeText : q.options.find((o) => o.id === chosen)?.label ?? ""}", but the correct answer is "${result.correctLabel}". Can you help me understand why?`,
                  )}`} className="mt-3 inline-flex items-center gap-1.5 min-h-9 text-sm font-semibold text-(--primary-deep) hover:underline">
                    <Sparkles size={15} aria-hidden /> Ask Msingi why
                  </Link>
                )}
              </AnswerFeedback>
            )}
            {submitError && <p role="alert" className="text-sm text-(--coral)">We couldn&apos;t check that answer. Please try again.</p>}

            <div className="flex justify-end">
              {!result ? (
                <Button type="submit" disabled={!canCheck || checking}>{checking ? "Checking…" : "Check answer"}</Button>
              ) : (
                <Button ref={nextRef} type="submit">{last ? "See results" : "Next question"} <ArrowRight size={16} aria-hidden /></Button>
              )}
            </div>
          </form>
        </Card>
      </div>
    </Shell>
  );
}

export default function PracticePage() {
  return <Suspense><PracticeInner /></Suspense>;
}
