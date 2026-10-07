"use client";
import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Shell } from "@/components/shell";
import { Button, Card, ErrorState, EmptyState, Skeleton, LoadingState } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import { practiceHref } from "@/lib/links";
import { BookMarked, XCircle, CheckCircle2, Sparkles, Dumbbell, ClipboardCheck, Target } from "lucide-react";

type Mistake = { id: string; question: string; topic: string; topicId?: string; chosen: string; correct?: string; explanation: string; date: string };
type Group = { key: string; topicId: string | null; topic: string; items: Mistake[] };

function MistakesInner() {
  const { data, loading, error, reload } = useApi<{ mistakes: Mistake[] }>("/api/mistakes");
  // ?topicId= narrows the book to one topic (the Topic Hub links here).
  const onlyTopicId = useSearchParams().get("topicId");
  const allMistakes = data?.mistakes ?? null;
  const mistakes = useMemo(() => (allMistakes && onlyTopicId ? allMistakes.filter((m) => m.topicId === onlyTopicId) : allMistakes), [allMistakes, onlyTopicId]);
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);

  // Grouped by topic id (names can repeat across grades); the most-missed topic comes first.
  const groups = useMemo<Group[]>(() => {
    const by = new Map<string, Group>();
    for (const m of mistakes ?? []) {
      const key = m.topicId ?? `name:${m.topic}`;
      const g = by.get(key) ?? { key, topicId: m.topicId ?? null, topic: m.topic, items: [] };
      g.items.push(m);
      by.set(key, g);
    }
    return [...by.values()].sort((a, b) => b.items.length - a.items.length);
  }, [mistakes]);

  async function markMastered(id: string) {
    if (pending) return; // one update at a time
    setPending(id);
    setActionError(false);
    try {
      const res = await fetch(`/api/mistakes/${id}`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      reload();
    } catch {
      setActionError(true);
    } finally {
      setPending(null);
    }
  }

  const weakest = groups[0];
  const total = mistakes?.length ?? 0;
  const filteredTopic = onlyTopicId ? groups[0]?.topic ?? allMistakes?.find((m) => m.topicId === onlyTopicId)?.topic ?? null : null;

  return (
    <Shell>
      <div className="fade-in max-w-3xl space-y-5">
        <header>
          <h1 className="disp text-3xl font-bold">My Mistakes</h1>
          <p className="text-sm text-(--ink-soft) mt-1">Your personal revision coach: practise the topics you miss most, then master each question.</p>
        </header>

        {onlyTopicId && (
          <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl bg-(--primary-soft) px-4 py-2.5 text-sm">
            <span>Showing mistakes for <b>{filteredTopic ?? "this topic"}</b>.</span>
            <div className="flex gap-3">
              <Link href={`/learn/topic/${onlyTopicId}`} className="font-semibold text-(--primary-deep) hover:underline">Back to topic</Link>
              <Link href="/mistakes" className="font-semibold text-(--primary-deep) hover:underline">Show all</Link>
            </div>
          </div>
        )}

        {actionError && <p role="alert" className="text-sm text-(--coral)">We couldn&apos;t update that mistake. Please try again.</p>}

        {loading ? (
          <LoadingState label="Loading your mistakes"><div className="space-y-4"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /></div></LoadingState>
        ) : error || !mistakes ? (
          <Card><ErrorState title="We couldn't load your Mistake Book" onRetry={reload} /></Card>
        ) : mistakes.length === 0 ? (
          <Card><EmptyState icon={<BookMarked size={22} />} title={onlyTopicId ? "No mistakes left in this topic" : "Nothing to revise right now"}
            description={onlyTopicId ? "You've cleared every mistake here. Practise again or retest to lock it in." : "When you get a question wrong in practice or a test, it's saved here with a way to practise that topic and master it."}
            action={onlyTopicId ? <Button href={`/learn/topic/${onlyTopicId}`}>Back to topic</Button> : <Button href="/practice"><Dumbbell size={16} aria-hidden /> Start practising</Button>} /></Card>
        ) : (
          <>
            <Card padding="lg" style={{ background: "linear-gradient(135deg, var(--coral-soft), #fff 70%)", borderColor: "var(--coral-soft)" }}>
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-white text-(--coral)" aria-hidden><Target size={20} /></span>
                <div className="min-w-0">
                  <p className="disp text-xl font-bold">{total} question{total === 1 ? "" : "s"} to master</p>
                  <p className="text-sm text-(--ink-soft) mt-0.5">
                    across {groups.length} topic{groups.length === 1 ? "" : "s"}.
                    {weakest && groups.length > 1 && <> Start with <b className="text-(--ink)">{weakest.topic}</b> ({weakest.items.length} missed).</>}
                  </p>
                </div>
              </div>
              {weakest && (
                <div className="flex flex-wrap gap-2.5 mt-4">
                  <Button href={practiceHref({ id: weakest.topicId, name: weakest.topic })} size="lg"><Dumbbell size={16} aria-hidden /> Practise {weakest.topic}</Button>
                  <Button href="/tests" size="lg" variant="secondary"><ClipboardCheck size={16} aria-hidden /> Retake a test</Button>
                </div>
              )}
            </Card>

            {groups.map((g) => (
              <section key={g.key} aria-labelledby={`g-${g.key}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap mb-2.5">
                  <h2 id={`g-${g.key}`} className="disp text-lg font-bold">
                    {g.topicId ? <Link href={`/learn/topic/${g.topicId}`} className="hover:text-(--primary-deep) hover:underline underline-offset-2">{g.topic}</Link> : g.topic} <span className="text-sm font-semibold text-(--ink-soft)">· {g.items.length} to master</span>
                  </h2>
                  <div className="flex gap-2">
                    <Button href={practiceHref({ id: g.topicId, name: g.topic })} size="md" variant="secondary" aria-label={`Practise ${g.topic}`}><Dumbbell size={16} aria-hidden /> Practise</Button>
                    <Button href={`/ai?topic=${encodeURIComponent(g.topic)}`} size="md" variant="ghost" aria-label={`Ask Msingi about ${g.topic}`}><Sparkles size={16} aria-hidden /> Ask Msingi</Button>
                  </div>
                </div>
                <ul className="space-y-3">
                  {g.items.map((m) => (
                    <li key={m.id}>
                      <Card padding="md">
                        <p className="font-semibold">{m.question}</p>
                        <p className="text-sm text-(--coral) mt-2 flex items-start gap-1.5"><XCircle size={16} className="shrink-0 mt-0.5" aria-hidden /><span>Your answer: {m.chosen}</span></p>
                        <p className="text-sm text-(--green) mt-1 flex items-start gap-1.5"><CheckCircle2 size={16} className="shrink-0 mt-0.5" aria-hidden /><span>Correct: {m.correct}</span></p>
                        {m.explanation && <p className="text-sm text-(--ink-soft) mt-2">{m.explanation}</p>}
                        <div className="flex flex-wrap items-center gap-2 mt-3.5">
                          <Button size="md" variant="success" disabled={pending === m.id} onClick={() => markMastered(m.id)}>
                            <CheckCircle2 size={16} aria-hidden /> {pending === m.id ? "Saving…" : "Mark as mastered"}
                          </Button>
                          <Link href={`/ai?mistakeId=${m.id}`} className="tap inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full text-sm font-semibold bg-(--primary-soft) text-(--primary-deep)">
                            <Sparkles size={14} aria-hidden /> Ask Msingi why
                          </Link>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>
    </Shell>
  );
}

export default function MistakesPage() {
  return <Suspense><MistakesInner /></Suspense>;
}
