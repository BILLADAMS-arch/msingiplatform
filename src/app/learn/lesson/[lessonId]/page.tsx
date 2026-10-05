"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Button, Card, Breadcrumbs, EmptyState, ErrorState, Skeleton, LoadingState } from "@/components/ui";
import { AnswerOptions, AnswerFeedback } from "@/components/question";
import { subjectAccent } from "@/lib/subject-colors";
import { practiceHref as practiceLink } from "@/lib/links";
import { BookOpen, Lightbulb, Star, Languages, ChevronLeft, ChevronRight, ListChecks, CheckCircle2, Dumbbell, ArrowRight, Info, Sparkles } from "lucide-react";

type Lesson = {
  id: string; title: string; topicName: string; topicId: string;
  breadcrumb: { grade: string; subjectId: string; subject: string; strand: string; subStrand: string; topic: string };
  sections: { kind: string; heading: string; body: string; note: string | null }[];
  quickCheck: { question: string; options: string[]; correctIndex: number; explanation: string } | null;
};

type Load = { status: "loading" } | { status: "notfound" } | { status: "error" } | { status: "ready"; lesson: Lesson };
type Completion = { status: "idle" } | { status: "saving" } | { status: "error" } | { status: "done"; xp: number; alreadyCompleted: boolean };

// How each lesson_sections.kind is presented. Unknown kinds fall back to "learn".
const KIND: Record<string, { label: string; icon: React.ReactNode; card: string; badge: string }> = {
  learn: { label: "Learn", icon: <BookOpen size={16} />, card: "bg-white border-(--slate)", badge: "bg-(--primary-soft) text-(--primary-deep)" },
  example: { label: "Worked example", icon: <Lightbulb size={16} />, card: "bg-white border-(--green)", badge: "bg-(--green-soft) text-(--green)" },
  keypoint: { label: "Key point", icon: <Star size={16} />, card: "bg-(--amber-soft) border-(--gold)", badge: "bg-white text-(--gold-deep)" },
  vocab: { label: "Vocabulary", icon: <Languages size={16} />, card: "bg-(--primary-soft) border-(--primary-soft)", badge: "bg-white text-(--primary-deep)" },
};

export default function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [completion, setCompletion] = useState<Completion>({ status: "idle" });
  const headingRef = useRef<HTMLHeadingElement>(null);

  const fetchLesson = useCallback(() => {
    fetch(`/api/lessons/${lessonId}`)
      .then(async (r) => {
        if (r.status === 404) return setLoad({ status: "notfound" });
        if (!r.ok) throw new Error(String(r.status));
        setLoad({ status: "ready", lesson: await r.json() });
      })
      .catch(() => setLoad({ status: "error" }));
  }, [lessonId]);
  useEffect(() => { fetchLesson(); }, [fetchLesson]);

  function goTo(next: number) {
    setIdx(next);
    window.scrollTo({ top: 0 });
    // Move focus to the new step's heading so keyboard/screen-reader users land on the new content.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  // Records completion exactly once, from an explicit learner action (never
  // during render). A ref, not state, guards it: two quick clicks both run
  // before React re-renders, so a state check alone would let both through.
  const finishingRef = useRef(false);
  async function finish() {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setCompletion({ status: "saving" });
    try {
      const res = await fetch(`/api/lessons/${lessonId}/complete`, { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      const body = await res.json().catch(() => ({}));
      setCompletion({ status: "done", xp: body.xpAwarded ?? 0, alreadyCompleted: !!body.alreadyCompleted });
      window.scrollTo({ top: 0 });
    } catch {
      finishingRef.current = false; // allow a retry
      setCompletion({ status: "error" });
    }
  }

  if (load.status === "loading") {
    return (
      <Shell>
        <LoadingState label="Loading lesson">
          <div className="max-w-2xl mx-auto space-y-5">
            <Skeleton className="h-4 w-72 max-w-full" /><Skeleton className="h-9 w-3/4" /><Skeleton className="h-2 w-full" /><Skeleton className="h-56 rounded-2xl" />
          </div>
        </LoadingState>
      </Shell>
    );
  }
  if (load.status === "notfound") {
    return (
      <Shell>
        <Card className="max-w-2xl mx-auto">
          <EmptyState icon={<BookOpen size={22} />} title="This lesson isn't available" description="It may have been unpublished or moved."
            action={<Button href="/learn">Back to Learn</Button>} />
        </Card>
      </Shell>
    );
  }
  if (load.status === "error") {
    return (
      <Shell>
        <Card className="max-w-2xl mx-auto"><ErrorState title="We couldn't load this lesson" onRetry={() => { setLoad({ status: "loading" }); fetchLesson(); }} /></Card>
      </Shell>
    );
  }

  const { lesson } = load;
  const b = lesson.breadcrumb;
  const accent = subjectAccent(b.subject);
  const subjectHref = `/learn?subjectId=${b.subjectId}`;
  const practiceHref = practiceLink({ id: lesson.topicId, name: lesson.topicName });
  const qc = lesson.quickCheck;
  const totalSteps = lesson.sections.length + (qc ? 1 : 0);
  const atQuickCheck = qc !== null && idx === lesson.sections.length;
  const isLastSection = idx === lesson.sections.length - 1;

  const header = (
    <div className="space-y-4">
      <Breadcrumbs items={[
        { label: b.grade, mobile: false },
        { label: b.subject, href: subjectHref },
        { label: b.strand, mobile: false },
        { label: b.subStrand, mobile: false },
        { label: b.topic },
      ]} />
      <div>
        <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: accent.color }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent.color }} aria-hidden /> Lesson · {b.subject}
        </div>
        <h1 className="disp text-2xl sm:text-3xl mt-1 leading-tight">{lesson.title}</h1>
      </div>
    </div>
  );

  /* -------- Completed -------- */
  if (completion.status === "done") {
    return (
      <Shell>
        <div className="fade-in max-w-2xl mx-auto space-y-6">
          {header}
          <Card padding="lg" className="text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-(--green-soft) text-(--green)" aria-hidden><CheckCircle2 size={28} /></div>
            <h2 className="disp text-2xl mt-4" tabIndex={-1}>Lesson complete</h2>
            <p className="text-sm text-(--ink-soft) mt-1">
              You finished <b className="text-(--ink)">{lesson.title}</b>{completion.xp > 0 ? <> and earned <b className="text-(--gold-deep)">+{completion.xp} XP</b></> : null}.
            </p>
            {completion.alreadyCompleted && (
              <p className="text-xs text-(--ink-soft) mt-1">You&apos;ve completed this lesson before — lesson XP is awarded the first time only.</p>
            )}
            <div className="mt-6 rounded-xl bg-(--stone-2) p-4 text-left flex items-start gap-3">
              <Dumbbell size={18} className="text-(--primary) shrink-0 mt-0.5" aria-hidden />
              <p className="text-sm"><b>Next: practise {b.topic}.</b> Practice is what builds mastery — each question adapts to how well you&apos;re doing.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <Button href={practiceHref} size="lg">Practise {b.topic} <ArrowRight size={18} aria-hidden /></Button>
              <Button href={subjectHref} size="lg" variant="secondary">Back to {b.subject}</Button>
            </div>
          </Card>
        </div>
      </Shell>
    );
  }

  const finishButton = (
    <Button onClick={finish} disabled={completion.status === "saving"}>
      {completion.status === "saving" ? "Saving…" : "Finish lesson"} {completion.status !== "saving" && <CheckCircle2 size={16} aria-hidden />}
    </Button>
  );
  const finishError = completion.status === "error" && (
    <p role="alert" className="text-sm text-(--coral) flex items-center gap-1.5"><Info size={14} aria-hidden /> We couldn&apos;t save your progress. Please try again.</p>
  );

  return (
    <Shell>
      <div className="fade-in max-w-2xl mx-auto space-y-6">
        {header}

        {/* Step progress */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-(--ink-soft) mb-2">
            <span>{atQuickCheck ? "Quick check" : `Part ${idx + 1} of ${lesson.sections.length}`}</span>
            <span>Step {idx + 1} of {totalSteps}</span>
          </div>
          <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={totalSteps} aria-valuenow={idx + 1} aria-label="Lesson progress">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className="h-1.5 flex-1 rounded-full"
                style={{ background: i < idx ? "var(--green)" : i === idx ? "var(--primary)" : "var(--stone-2)" }} />
            ))}
          </div>
        </div>

        {lesson.sections.length === 0 && !qc ? (
          <Card><EmptyState compact icon={<BookOpen size={22} />} title="This lesson has no content yet" action={<Button href={subjectHref} variant="secondary">Back to {b.subject}</Button>} /></Card>
        ) : !atQuickCheck ? (
          (() => {
            const s = lesson.sections[idx];
            const k = KIND[s.kind] ?? KIND.learn;
            const showHeading = s.heading.trim().toLowerCase() !== k.label.toLowerCase();
            return (
              <article key={idx} className={`fade-in rounded-2xl border p-5 sm:p-7 ${k.card}`} style={{ boxShadow: "var(--shadow-card)" }} aria-labelledby="step-heading">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${k.badge}`}>
                  <span aria-hidden>{k.icon}</span>{k.label}
                </span>
                <h2 id="step-heading" ref={headingRef} tabIndex={-1} className={showHeading ? "disp text-xl mt-3" : "sr-only"}>{showHeading ? s.heading : k.label}</h2>
                <p className={`mt-3 text-base leading-relaxed whitespace-pre-line ${s.kind === "example" ? "font-semibold text-(--ink)" : ""}`}>{s.body}</p>
                {s.note && (
                  <p className="mt-4 text-sm text-(--ink-soft) border-l-2 border-(--slate) pl-3 leading-relaxed whitespace-pre-line">{s.note}</p>
                )}
              </article>
            );
          })()
        ) : (
          <Card padding="lg" className="fade-in">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-(--amber-soft) text-(--gold-deep)">
              <ListChecks size={16} aria-hidden /> Quick check
            </span>
            <h2 id="step-heading" ref={headingRef} tabIndex={-1} className="font-semibold text-lg mt-3 mb-4">{qc!.question}</h2>
            <form onSubmit={(e) => { e.preventDefault(); if (chosen !== null && !checked) setChecked(true); }} className="space-y-4">
              <AnswerOptions name="quick-check" legend={qc!.question} value={chosen} onChange={setChosen} disabled={checked}
                options={qc!.options.map((label, i) => ({ id: String(i), label }))}
                reveal={checked ? { correctId: String(qc!.correctIndex), chosenId: chosen } : undefined} />
              {!checked ? (
                <Button type="submit" disabled={chosen === null}>Check answer</Button>
              ) : (
                <AnswerFeedback correct={chosen === String(qc!.correctIndex)} explanation={qc!.explanation} />
              )}
            </form>
          </Card>
        )}

        {/* Step navigation */}
        {(lesson.sections.length > 0 || qc) && (
          <div className="space-y-3">
            <Link href={`/ai?topic=${encodeURIComponent(b.topic)}`}
              className="inline-flex items-center gap-1.5 min-h-9 text-sm font-semibold text-(--primary-deep) hover:underline">
              <Sparkles size={15} aria-hidden /> Stuck? Ask Msingi to explain {b.topic} another way
            </Link>
            {finishError}
            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => goTo(idx - 1)} disabled={idx === 0}><ChevronLeft size={16} aria-hidden /> Previous</Button>
              {atQuickCheck ? (
                checked ? finishButton : <span className="text-xs text-(--ink-soft) text-right">Answer to finish the lesson</span>
              ) : isLastSection && !qc ? (
                finishButton
              ) : (
                <Button onClick={() => goTo(idx + 1)}>{isLastSection ? "Quick check" : "Next"} <ChevronRight size={16} aria-hidden /></Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
