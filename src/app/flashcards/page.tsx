"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Shell } from "@/components/shell";
import { Pill } from "@/components/ui";
import { Shuffle, Layers } from "lucide-react";

type Card = { id: string; front: string; back: string; status: string };

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
  const topic = params.get("topic");

  const [cards, setCards] = useState<Card[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!topic) return;
    fetch(`/api/flashcards?topic=${encodeURIComponent(topic)}`)
      .then((r) => r.json())
      .then((d) => setCards(d.cards ?? []));
  }, [topic]);

  async function rate(status: "easy" | "difficult" | "review_later") {
    if (!cards) return;
    const card = cards[idx];
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
  }

  if (topic && !cards) return <Shell><p className="text-sm text-[--ink-soft]">Loading flashcards…</p></Shell>;

  if (!cards || cards.length === 0) {
    return (
      <Shell>
        <div className="fade-in text-center py-20 max-w-sm mx-auto">
          <Layers size={36} className="mx-auto text-[--ink-soft] mb-3" />
          <h2 className="disp text-xl font-bold mb-1">No flashcards yet</h2>
          <p className="text-sm text-[--ink-soft]">
            {topic ? <>There isn&apos;t a flashcard set for {topic} yet.</> : <>Open a topic from <a href="/learn" className="font-semibold text-[--primary]">Learn</a> to review its flashcards.</>}
          </p>
        </div>
      </Shell>
    );
  }

  if (idx >= cards.length) {
    return (
      <Shell>
        <div className="fade-in max-w-md mx-auto text-center space-y-4 py-10">
          <Layers size={36} className="mx-auto text-[--primary]" />
          <h1 className="disp text-3xl font-bold">Deck Complete!</h1>
          <p className="text-[--ink-soft]">You reviewed all {cards.length} cards for {topic}.</p>
          <button onClick={reshuffle} className="tap px-6 py-3 rounded-full font-semibold text-white flex items-center gap-2 mx-auto" style={{ background: "var(--primary)" }}>
            <Shuffle size={16} /> Review Again
          </button>
        </div>
      </Shell>
    );
  }

  const card = cards[idx];

  return (
    <Shell>
      <div className="fade-in max-w-xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="disp text-3xl font-bold">Flashcards — {topic}</h1>
          <button onClick={reshuffle} className="tap flex items-center gap-1 text-xs font-semibold text-[--ink-soft]"><Shuffle size={14} /> Shuffle</button>
        </div>
        <div className="text-sm text-[--ink-soft]">Card {idx + 1} of {cards.length}</div>

        <button
          onClick={() => setFlipped((f) => !f)}
          className="tap w-full min-h-64 rounded-3xl p-8 border shadow-sm flex flex-col items-center justify-center text-center gap-3"
          style={{ borderColor: "var(--slate)", background: flipped ? "var(--amber-soft)" : "white" }}
        >
          <Pill tone={flipped ? "green" : "gold"}>{flipped ? "Answer" : "Question"}</Pill>
          <p className="text-lg font-medium leading-relaxed">{flipped ? card.back : card.front}</p>
          {!flipped && <p className="text-xs text-[--ink-soft] mt-2">Tap to reveal</p>}
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
