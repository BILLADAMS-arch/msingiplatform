"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Shell } from "@/components/shell";
import { Pill, Card, Button, ErrorState, Skeleton, LoadingState } from "@/components/ui";
import { practiceHref } from "@/lib/links";
import { Shuffle, Layers, Dumbbell, RotateCcw, ArrowLeft, PartyPopper } from "lucide-react";

type FlashCard = { id: string; front: string; back: string; status: string };
type Rating = "easy" | "difficult" | "review_later";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function FlashcardsInner() {
  const params = useSearchParams();
  // ?topicId= is the identity; ?topic=<name> is still honoured for old links.
  const topicId = params.get("topicId");
  const legacyTopicName = topicId ? null : params.get("topic");
  const topic = topicId ?? legacyTopicName; // whether a topic was requested at all
  const [topicName, setTopicName] = useState<string | null>(legacyTopicName);

  const [cards, setCards] = useState<FlashCard[] | null>(null);
  const [resolvedTopicId, setResolvedTopicId] = useState<string | null>(topicId);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  // What the learner rated in THIS run through the deck (real actions only).
  const [ratings, setRatings] = useState<Record<string, Rating>>({});

  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!topic) return;
    fetch(topicId ? `/api/flashcards?topicId=${encodeURIComponent(topicId)}` : `/api/flashcards?topic=${encodeURIComponent(topic)}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setTopicName(d.topic ?? null); setResolvedTopicId(d.topicId ?? topicId); setCards(d.cards ?? []); })
      .catch(() => setLoadError(true));
  }, [topic, topicId, attempt]);

  async function rate(status: Rating) {
    if (!cards) return;
    const card = cards[idx];
    setRatings((r) => ({ ...r, [card.id]: status }));
    await fetch("/api/flashcards/progress", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flashcardId: card.id, status }),
    });
    setFlipped(false);
    setIdx((i) => i + 1);
  }

  function reshuffle() {
    if (!cards) return;
    setCards(shuffle(cards));
    setIdx(0);
    setFlipped(false);
    setRatings({});
  }

  // Go round again with only the cards the learner just marked difficult.
  function reviewDifficult() {
    if (!cards) return;
    const hard = cards.filter((c) => ratings[c.id] === "difficult");
    if (hard.length === 0) return;
    setCards(shuffle(hard));
    setIdx(0);
    setFlipped(false);
    setRatings({});
  }

  if (topic && loadError) {
    return <Shell><Card className="max-w-md mx-auto"><ErrorState title="We couldn't load these flashcards" onRetry={() => { setLoadError(false); setAttempt((a) => a + 1); }} /></Card></Shell>;
  }
  if (topic && !cards) {
    return <Shell><LoadingState label="Loading flashcards"><div className="max-w-md mx-auto space-y-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-64 rounded-2xl" /></div></LoadingState></Shell>;
  }

  if (!cards || cards.length === 0) {
    return (
      <Shell>
        <div className="fade-in text-center py-20 max-w-sm mx-auto">
          <Layers size={36} className="mx-auto text-(--ink-soft) mb-3" />
          <h2 className="disp text-xl font-bold mb-1">No flashcards yet</h2>
          <p className="text-sm text-(--ink-soft)">
            {topic ? <>There isn&apos;t a flashcard set for {topicName ?? "this topic"} yet.</> : <>Open a topic from <a href="/learn" className="font-semibold text-(--primary)">Learn</a> to review its flashcards.</>}
          </p>
        </div>
      </Shell>
    );
  }

  if (idx >= cards.length) {
    const count = (r: Rating) => cards.filter((c) => ratings[c.id] === r).length;
    const easy = count("easy"), later = count("review_later"), hard = count("difficult");
    return (
      <Shell>
        <div className="fade-in max-w-md mx-auto">
          <Card padding="lg" className="text-center">
            <PartyPopper size={30} className="mx-auto text-(--gold-deep)" aria-hidden />
            <h1 className="disp text-2xl sm:text-3xl mt-2">Deck complete</h1>
            <p className="text-sm text-(--ink-soft) mt-1">You reviewed {cards.length} card{cards.length === 1 ? "" : "s"}{topicName ? <> for {topicName}</> : null}.</p>
            <dl className="grid grid-cols-3 gap-2 mt-5 text-center">
              <div className="rounded-xl py-3" style={{ background: "var(--green-soft)" }}><dd className="disp text-xl text-(--green)">{easy}</dd><dt className="text-[11px] text-(--ink-soft)">Easy</dt></div>
              <div className="rounded-xl py-3" style={{ background: "var(--stone-2)" }}><dd className="disp text-xl">{later}</dd><dt className="text-[11px] text-(--ink-soft)">Review later</dt></div>
              <div className="rounded-xl py-3" style={{ background: "var(--coral-soft)" }}><dd className="disp text-xl text-(--coral)">{hard}</dd><dt className="text-[11px] text-(--ink-soft)">Difficult</dt></div>
            </dl>
            <div className="grid gap-2.5 mt-6">
              {hard > 0 && <Button size="lg" onClick={reviewDifficult}><RotateCcw size={16} aria-hidden /> Review the {hard} difficult card{hard === 1 ? "" : "s"}</Button>}
              {(resolvedTopicId || topicName) && (
                <Button size="lg" variant={hard > 0 ? "secondary" : "primary"} href={practiceHref({ id: resolvedTopicId, name: topicName })}><Dumbbell size={16} aria-hidden /> Practise {topicName ?? "this topic"}</Button>
              )}
              <Button size="lg" variant="secondary" onClick={reshuffle}><Shuffle size={16} aria-hidden /> Go through the deck again</Button>
              <Button size="lg" variant="ghost" href="/learn"><ArrowLeft size={16} aria-hidden /> Back to Learn</Button>
            </div>
          </Card>
        </div>
      </Shell>
    );
  }

  const card = cards[idx];

  return (
    <Shell>
      <div className="fade-in max-w-xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="disp text-3xl font-bold">Flashcards — {topicName}</h1>
          <button onClick={reshuffle} className="tap flex items-center gap-1 text-xs font-semibold text-(--ink-soft)"><Shuffle size={14} /> Shuffle</button>
        </div>
        <div className="text-sm text-(--ink-soft)">Card {idx + 1} of {cards.length}</div>

        <button
          onClick={() => setFlipped((f) => !f)}
          className="tap w-full min-h-64 rounded-3xl p-8 border shadow-sm flex flex-col items-center justify-center text-center gap-3"
          style={{ borderColor: "var(--slate)", background: flipped ? "var(--amber-soft)" : "white" }}
        >
          <Pill tone={flipped ? "green" : "gold"}>{flipped ? "Answer" : "Question"}</Pill>
          <p className="text-lg font-medium leading-relaxed">{flipped ? card.back : card.front}</p>
          {!flipped && <p className="text-xs text-(--ink-soft) mt-2">Tap to reveal</p>}
        </button>

        {flipped && (
          <div className="fade-in grid grid-cols-3 gap-2">
            <button onClick={() => rate("difficult")} className="tap px-4 py-3 rounded-xl font-semibold text-sm" style={{ background: "var(--coral-soft)", color: "var(--coral)" }}>Difficult</button>
            <button onClick={() => rate("review_later")} className="tap px-4 py-3 rounded-xl font-semibold text-sm" style={{ background: "var(--stone-2)" }}>Review Later</button>
            <button onClick={() => rate("easy")} className="tap px-4 py-3 rounded-xl font-semibold text-sm" style={{ background: "var(--green-soft)", color: "var(--green)" }}>Easy</button>
          </div>
        )}
      </div>
    </Shell>
  );
}

export default function FlashcardsPage() {
  return <Suspense><FlashcardsInner /></Suspense>;
}
