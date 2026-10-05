"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Shell } from "@/components/shell";
import { Button, Card, Pill, FoundationBar, ProgressRing, EmptyState, ErrorState, Skeleton, LoadingState } from "@/components/ui";
import { AnswerOptions, AnswerInput } from "@/components/question";
import { practiceHref } from "@/lib/links";
import {
  Clock, ChevronLeft, ChevronRight, ClipboardCheck, CheckCircle2, XCircle, Dumbbell, BookMarked, RotateCcw, ArrowRight, Timer, Target, AlertTriangle, Check,
} from "lucide-react";

type TQuestion = { id: string; type: string; prompt: string; topicId: string; options: { id: string; label: string }[] };
type StartResp = { attemptId: string; test: { id: string; title: string; timeLimitSeconds: number | null; passingThreshold: number }; questions: TQuestion[] };
type TestMeta = { title: string; type: string; passingThreshold: number; timeLimitSeconds: number | null; questionCount: number; topics: string[] };
type SubmitResult = {
  score: number; correct: number; total: number; timeTaken: string;
  byTopic: Record<string, { correct: number; total: number; topicId?: string }>;
  previousScore: number | null; improvement: number | null; xpAwarded: number;
};

type Stage =
  | { kind: "intro" }
  | { kind: "taking" }
  | { kind: "submitting"; auto: boolean }
  | { kind: "submitError"; alreadySubmitted: boolean; timeLimitPassed?: boolean }
  | { kind: "results"; result: SubmitResult; answeredCount: number; timedOut: boolean };

function mmss(total: number) {
  const s = Math.max(0, Math.floor(total));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function TestPage() {
  const { testId } = useParams<{ testId: string }>();
  const [meta, setMeta] = useState<{ status: "loading" } | { status: "notfound" } | { status: "error" } | { status: "ready"; data: TestMeta }>({ status: "loading" });
  const [stage, setStage] = useState<Stage>({ kind: "intro" });
  const [session, setSession] = useState<StartResp | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const startedAtRef = useRef(0);
  const submittingRef = useRef(false);
  const timedOutRef = useRef(false);
  const warnedRef = useRef(false);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);

  const fetchMeta = useCallback(() => {
    fetch(`/api/tests/${testId}`)
      .then(async (r) => {
        if (r.status === 404) return setMeta({ status: "notfound" });
        if (!r.ok) throw new Error();
        setMeta({ status: "ready", data: await r.json() });
      })
      .catch(() => setMeta({ status: "error" }));
  }, [testId]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const limit = session?.test.timeLimitSeconds ?? null;

  // Submits the attempt exactly once. Grading stays entirely server-side
  // (PATCH /api/tests/attempts/:id) — the payload shape is unchanged.
  const submit = useCallback(async (auto = false) => {
    if (!session || submittingRef.current) return;
    submittingRef.current = true;
    if (auto) timedOutRef.current = true;
    setConfirmingSubmit(false);
    setStage({ kind: "submitting", auto: timedOutRef.current });
    const secondsTaken = Math.floor((Date.now() - startedAtRef.current) / 1000);
    const payload = {
      answers: session.questions.map((q) => {
        const value = answers[q.id];
        if (q.type === "numerical") return { questionId: q.id, answerNumeric: value !== undefined && value !== "" ? Number(value) : null };
        if (q.type === "short_answer") return { questionId: q.id, answerText: value ?? null };
        return { questionId: q.id, chosenOptionId: value ?? null };
      }),
      // A timed test can't report more time than it allows.
      timeTakenSeconds: limit ? Math.min(secondsTaken, limit) : secondsTaken,
    };
    try {
      const res = await fetch(`/api/tests/attempts/${session.attemptId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (res.status === 409) {
        // The server refuses a submission that arrives after the time limit
        // (plus grace) — distinct from a repeat of an already-graded attempt.
        const body = await res.json().catch(() => null);
        setStage({ kind: "submitError", alreadySubmitted: true, timeLimitPassed: body?.error === "time_limit_exceeded" });
        return;
      }
      if (!res.ok) throw new Error();
      const result: SubmitResult = await res.json();
      // Count distinct questions: the server grades each question once, even
      // if a test lists the same question twice.
      const answeredCount = new Set(session.questions.filter((q) => (answers[q.id] ?? "") !== "").map((q) => q.id)).size;
      setStage({ kind: "results", result, answeredCount, timedOut: timedOutRef.current });
      window.scrollTo({ top: 0 });
    } catch {
      submittingRef.current = false; // allow Retry — answers are kept
      setStage({ kind: "submitError", alreadySubmitted: false });
    }
  }, [session, answers, limit]);

  // Latest submit for the timer callback, without restarting the interval.
  const submitRef = useRef(submit);
  useEffect(() => { submitRef.current = submit; }, [submit]);

  // Clock based on real elapsed time (robust to throttled background tabs).
  // Enforces timeLimitSeconds: at zero, answers so far are submitted.
  useEffect(() => {
    if (stage.kind !== "taking") return;
    const t = setInterval(() => {
      const secs = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setElapsed(secs);
      if (limit) {
        const left = limit - secs;
        if (left <= 60 && left > 0 && !warnedRef.current && limit > 60) {
          warnedRef.current = true;
          setAnnouncement("One minute remaining.");
        }
        if (left <= 0) {
          setAnnouncement("Time is up. Submitting your answers.");
          submitRef.current(true);
        }
      }
    }, 1000);
    return () => clearInterval(t);
  }, [stage.kind, limit]);

  const startingRef = useRef(false);
  async function begin() {
    if (startingRef.current) return; // one click = one attempt row
    startingRef.current = true;
    setStarting(true);
    setStartError(false);
    try {
      const res = await fetch(`/api/tests/${testId}/attempts`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data: StartResp = await res.json();
      setSession(data);
      setAnswers({}); setIdx(0); setElapsed(0);
      submittingRef.current = false; timedOutRef.current = false; warnedRef.current = false;
      startedAtRef.current = Date.now();
      setStage({ kind: "taking" });
    } catch {
      setStartError(true);
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }

  function goTo(i: number) {
    setIdx(i);
    requestAnimationFrame(() => questionHeadingRef.current?.focus());
  }

  function retake() {
    setSession(null);
    setStage({ kind: "intro" });
    window.scrollTo({ top: 0 });
  }

  /* -------- Meta loading / errors -------- */
  if (meta.status === "loading") {
    return <Shell><LoadingState label="Loading test"><div className="max-w-xl mx-auto space-y-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-48 rounded-2xl" /></div></LoadingState></Shell>;
  }
  if (meta.status === "notfound") {
    return <Shell><Card className="max-w-xl mx-auto"><EmptyState icon={<ClipboardCheck size={22} />} title="This test isn't available" description="It may have been unpublished." action={<Button href="/tests">All tests</Button>} /></Card></Shell>;
  }
  if (meta.status === "error") {
    return <Shell><Card className="max-w-xl mx-auto"><ErrorState title="We couldn't load this test" onRetry={() => { setMeta({ status: "loading" }); fetchMeta(); }} /></Card></Shell>;
  }
  const m = meta.data;

  /* -------- Intro -------- */
  if (stage.kind === "intro") {
    return (
      <Shell>
        <div className="fade-in max-w-xl mx-auto">
          <Card padding="lg">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-(--primary-soft) text-(--primary-deep)" aria-hidden><ClipboardCheck size={22} /></div>
            <p className="text-xs font-bold uppercase tracking-wider text-(--ink-soft) mt-4">{m.type} test</p>
            <h1 className="disp text-2xl sm:text-3xl mt-1 leading-tight">{m.title}</h1>
            <dl className="grid grid-cols-3 gap-2 mt-5 text-center">
              <div className="rounded-xl bg-(--stone-2) p-3"><dt className="text-[11px] text-(--ink-soft)">Questions</dt><dd className="disp text-lg">{m.questionCount}</dd></div>
              <div className="rounded-xl bg-(--stone-2) p-3"><dt className="text-[11px] text-(--ink-soft)">Time</dt><dd className="disp text-lg">{m.timeLimitSeconds ? `${Math.round(m.timeLimitSeconds / 60)} min` : "Untimed"}</dd></div>
              <div className="rounded-xl bg-(--stone-2) p-3"><dt className="text-[11px] text-(--ink-soft)">Pass mark</dt><dd className="disp text-lg">{m.passingThreshold}%</dd></div>
            </dl>
            {m.topics.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold text-(--ink-soft) mb-2">Topics covered</p>
                <ul className="flex flex-wrap gap-1.5">{m.topics.map((t) => <li key={t}><Pill tone="blue">{t}</Pill></li>)}</ul>
              </div>
            )}
            <ul className="mt-5 space-y-1.5 text-sm text-(--ink-soft)">
              <li className="flex gap-2"><Check size={16} className="text-(--green) shrink-0 mt-0.5" aria-hidden /> You can move between questions and change answers before submitting.</li>
              <li className="flex gap-2"><Check size={16} className="text-(--green) shrink-0 mt-0.5" aria-hidden /> Answers are graded when you submit — nothing is revealed before then.</li>
              {m.timeLimitSeconds ? <li className="flex gap-2"><Timer size={16} className="text-(--gold-deep) shrink-0 mt-0.5" aria-hidden /> When time runs out, your answers are submitted automatically.</li> : null}
            </ul>
            {startError && <p role="alert" className="text-sm text-(--coral) mt-4">We couldn&apos;t start the test. Please try again.</p>}
            {m.questionCount === 0 ? (
              <p className="text-sm text-(--ink-soft) mt-6">This test has no questions yet.</p>
            ) : (
              <Button size="lg" full className="mt-6" onClick={begin} disabled={starting}>{starting ? "Starting…" : "Start test"} {!starting && <ArrowRight size={18} aria-hidden />}</Button>
            )}
            <Button href="/tests" variant="ghost" full className="mt-2">All tests</Button>
          </Card>
        </div>
      </Shell>
    );
  }

  /* -------- Submitting / submit errors -------- */
  if (stage.kind === "submitting") {
    return (
      <Shell>
        <Card className="max-w-xl mx-auto text-center" padding="lg">
          <LoadingState label="Submitting your answers">
            <p className="font-semibold">{stage.auto ? "Time's up — submitting your answers…" : "Submitting your answers…"}</p>
            <Skeleton className="h-2 mt-4" />
          </LoadingState>
        </Card>
      </Shell>
    );
  }
  if (stage.kind === "submitError") {
    return (
      <Shell>
        <Card className="max-w-xl mx-auto">
          {stage.timeLimitPassed ? (
            <EmptyState icon={<Timer size={22} />} title="Time ran out for this attempt" description="The time limit had passed before your answers reached us, so this attempt couldn't be graded. You can start a new attempt."
              action={<Button onClick={retake}><RotateCcw size={16} aria-hidden /> Start a new attempt</Button>} />
          ) : stage.alreadySubmitted ? (
            <EmptyState icon={<ClipboardCheck size={22} />} title="This attempt was already submitted" description="Your results were saved. You can start a new attempt."
              action={<Button onClick={retake}><RotateCcw size={16} aria-hidden /> Start a new attempt</Button>} />
          ) : (
            <ErrorState title="We couldn't submit your test" message="Your answers are still here. Check your connection and try again." onRetry={() => submit(timedOutRef.current)} />
          )}
        </Card>
      </Shell>
    );
  }

  /* -------- Results -------- */
  if (stage.kind === "results") {
    return <Results meta={m} threshold={session?.test.passingThreshold ?? m.passingThreshold} stage={stage} onRetake={retake} />;
  }

  /* -------- Taking -------- */
  if (!session) return null;
  const q = session.questions[idx];
  const total = session.questions.length;
  const isAnswered = (id: string) => (answers[id] ?? "") !== "";
  const answeredCount = session.questions.filter((qq) => isAnswered(qq.id)).length;
  const unanswered = total - answeredCount;
  const remaining = limit ? limit - elapsed : null;
  const lowTime = remaining !== null && remaining <= 60;
  const setAnswer = (value: string) => setAnswers((a) => ({ ...a, [q.id]: value }));

  return (
    <Shell>
      <div className="fade-in max-w-2xl mx-auto space-y-5">
        <p className="sr-only" aria-live="assertive">{announcement}</p>

        {/* Header: title + timer */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-(--ink-soft) truncate">Test · {session.test.title}</p>
          <div role="timer" aria-label={remaining !== null ? "Time remaining" : "Time elapsed"}
            className={`shrink-0 flex items-center gap-1.5 min-h-9 px-3 rounded-full text-sm font-bold tabular-nums border ${lowTime ? "bg-(--coral-soft) border-(--coral) text-(--coral)" : "bg-white border-(--slate)"}`}>
            <Clock size={15} aria-hidden />
            {remaining !== null ? <>{mmss(remaining)}<span className="font-medium text-xs"> left</span></> : mmss(elapsed)}
          </div>
        </div>

        {/* Navigator */}
        <Card padding="sm">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <h2 className="text-sm font-semibold">Questions</h2>
            <span className="text-xs text-(--ink-soft)"><b className="text-(--ink)">{answeredCount}</b> of {total} answered</span>
          </div>
          <nav aria-label="Question navigator">
            <ol className="flex flex-wrap gap-1.5">
              {session.questions.map((qq, i) => {
                const current = i === idx;
                const done = isAnswered(qq.id);
                return (
                  <li key={`${qq.id}-${i}`}>
                    <button type="button" onClick={() => goTo(i)} aria-current={current ? "step" : undefined}
                      aria-label={`Question ${i + 1}, ${done ? "answered" : "not answered"}${current ? ", current" : ""}`}
                      className={`tap relative w-10 h-10 rounded-lg text-sm font-bold border-2 ${current ? "bg-(--primary) border-(--primary) text-white" : done ? "bg-(--primary-soft) border-(--primary-soft) text-(--primary-deep)" : "bg-white border-dashed border-(--slate) text-(--ink-soft)"}`}>
                      {i + 1}
                      {done && !current && <Check size={11} strokeWidth={3} className="absolute top-0.5 right-0.5 text-(--primary-deep)" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-[11px] text-(--ink-soft)" aria-hidden>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-(--primary)" /> Current</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-(--primary-soft)" /> Answered</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-dashed border-(--slate)" /> Not answered</span>
          </div>
        </Card>

        {/* Question */}
        <Card padding="lg">
          <p className="text-xs font-semibold text-(--ink-soft)">Question {idx + 1} of {total}</p>
          <h1 ref={questionHeadingRef} tabIndex={-1} className="font-semibold text-lg leading-snug mt-1 mb-5">{q.prompt}</h1>
          {q.type === "short_answer" || q.type === "numerical" ? (
            <AnswerInput id={`answer-${q.id}`} type={q.type} value={answers[q.id] ?? ""} onChange={setAnswer} />
          ) : (
            <AnswerOptions key={`${q.id}-${idx}`} name={`q-${q.id}`} legend={q.prompt} options={q.options} value={answers[q.id] ?? null} onChange={setAnswer} />
          )}
        </Card>

        {/* Controls */}
        {confirmingSubmit ? (
          <Card padding="md" className="border-(--gold)!" style={{ background: "var(--amber-soft)" }}>
            <div role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-desc">
              <p id="confirm-title" className="font-bold flex items-center gap-2"><AlertTriangle size={16} className="text-(--gold-deep)" aria-hidden /> Submit with {unanswered} unanswered?</p>
              <p id="confirm-desc" className="text-sm text-(--ink-soft) mt-1">Unanswered questions are marked incorrect.</p>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <Button variant="secondary" onClick={() => { setConfirmingSubmit(false); const first = session.questions.findIndex((qq) => !isAnswered(qq.id)); if (first >= 0) goTo(first); }}>Go to first unanswered</Button>
                <Button variant="success" onClick={() => submit()}>Submit anyway</Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => goTo(idx - 1)} disabled={idx === 0}><ChevronLeft size={16} aria-hidden /> Previous</Button>
            <div className="flex gap-2">
              {idx < total - 1 && <Button onClick={() => goTo(idx + 1)}>Next <ChevronRight size={16} aria-hidden /></Button>}
              {(idx === total - 1 || answeredCount === total) && (
                <Button variant="success" onClick={() => (unanswered > 0 ? setConfirmingSubmit(true) : submit())}>Submit test</Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

/* ---------------------------------------------------------------------- */
/* Results                                                                  */
/* ---------------------------------------------------------------------- */

function Results({ meta, threshold, stage, onRetake }: {
  meta: TestMeta; threshold: number; stage: Extract<Stage, { kind: "results" }>; onRetake: () => void;
}) {
  const { result, answeredCount, timedOut } = stage;
  const passed = result.score >= threshold;
  const wrong = result.total - result.correct;
  // Per-topic accuracy against the same pass mark the test uses.
  const topics = Object.entries(result.byTopic)
    .map(([name, v]) => ({ name, topicId: v.topicId ?? null, pct: Math.round((v.correct / v.total) * 100), correct: v.correct, total: v.total }))
    .sort((a, b) => a.pct - b.pct);
  const weak = topics.filter((t) => t.pct < threshold);
  const weakest = weak[0];

  return (
    <Shell>
      <div className="fade-in max-w-2xl mx-auto space-y-6">
        {timedOut && (
          <p className="text-sm rounded-xl bg-(--amber-soft) text-(--gold-deep) px-4 py-3 flex items-center gap-2 font-semibold">
            <Timer size={16} aria-hidden /> Time ran out — your answers were submitted automatically.
          </p>
        )}

        <Card padding="lg" className="text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-(--ink-soft)">Results · {meta.title}</p>
          <div className="mt-5 flex justify-center">
            <ProgressRing pct={result.score} size={140} stroke={11} tone={passed ? "green" : "coral"} label={`Score ${result.score}%`}>
              <div><div className="disp text-3xl">{result.score}%</div><div className="text-[11px] text-(--ink-soft)">score</div></div>
            </ProgressRing>
          </div>
          <div className="mt-4 flex justify-center">
            {passed ? (
              <Pill tone="green"><CheckCircle2 size={14} aria-hidden /> Passed — pass mark {threshold}%</Pill>
            ) : (
              <Pill tone="coral"><XCircle size={14} aria-hidden /> Not passed yet — pass mark {threshold}%</Pill>
            )}
          </div>
          <h1 className="disp text-2xl mt-3">{passed ? "Great work!" : "Let's close the gap."}</h1>
          {result.previousScore !== null && result.improvement !== null && (
            <p className="text-sm text-(--ink-soft) mt-1">
              {result.improvement > 0 ? `Up ${result.improvement} points` : result.improvement < 0 ? `Down ${Math.abs(result.improvement)} points` : "Same score"} from your previous attempt ({result.previousScore}%).
            </p>
          )}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
            <Stat label="Correct" value={`${result.correct}/${result.total}`} />
            <Stat label="Answered" value={`${answeredCount}/${result.total}`} />
            <Stat label="Time taken" value={result.timeTaken} />
            <Stat label="XP earned" value={`+${result.xpAwarded}`} />
          </dl>
        </Card>

        {/* Next steps — the Analyse → Revise → Retest part of the loop */}
        <Card padding="lg">
          <h2 className="disp text-lg">What to do next</h2>
          <div className="grid gap-2.5 mt-4">
            {weakest && (
              <Button size="lg" href={practiceHref({ id: weakest.topicId, name: weakest.name })} variant={passed ? "secondary" : "primary"}>
                <Dumbbell size={16} aria-hidden /> Practise {weakest.name}
              </Button>
            )}
            {wrong > 0 && (
              <Button size="lg" variant="secondary" href="/mistakes"><BookMarked size={16} aria-hidden /> Review the {wrong} question{wrong === 1 ? "" : "s"} you missed</Button>
            )}
            <Button size="lg" variant={passed || !weakest ? "secondary" : "ghost"} onClick={onRetake}><RotateCcw size={16} aria-hidden /> Retake this test</Button>
            {passed && <Button size="lg" href="/dashboard">Continue learning <ArrowRight size={16} aria-hidden /></Button>}
          </div>
          {wrong > 0 && <p className="text-xs text-(--ink-soft) mt-3">Questions you got wrong are saved in your Mistake Book.</p>}
        </Card>

        <Card padding="none">
          <div className="px-5 pt-5 pb-2">
            <h2 className="disp text-lg">Performance by topic</h2>
            <p className="text-xs text-(--ink-soft) mt-0.5">Topics below the {threshold}% pass mark need more practice.</p>
          </div>
          <ul className="divide-y divide-(--stone-2)">
            {topics.map((t) => {
              const ok = t.pct >= threshold;
              return (
                <li key={t.name} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{t.name}</span>
                      <Pill tone={ok ? "green" : "coral"}>{ok ? <><Target size={12} aria-hidden /> On track</> : "Needs practice"}</Pill>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex-1 max-w-xs"><FoundationBar pct={t.pct} tone={ok ? "green" : "coral"} height={6} label={`${t.name}: ${t.pct}%`} /></div>
                      <span className="text-xs font-semibold tabular-nums">{t.correct}/{t.total} · {t.pct}%</span>
                    </div>
                  </div>
                  {!ok && (
                    <Button size="sm" variant="secondary" href={practiceHref({ id: t.topicId, name: t.name })} aria-label={`Practise ${t.name}`}>
                      <Dumbbell size={14} aria-hidden /> Practise
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-(--stone-2) p-3">
      <dt className="text-[11px] text-(--ink-soft)">{label}</dt>
      <dd className="disp text-lg tabular-nums">{value}</dd>
    </div>
  );
}
