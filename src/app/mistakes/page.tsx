"use client";
import { useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Pill, Card, ErrorState, Skeleton, LoadingState } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import { BookMarked, XCircle, CheckCircle2, Sparkles } from "lucide-react";

type Mistake = { id: string; question: string; topic: string; chosen: string; correct?: string; explanation: string; date: string };

export default function MistakesPage() {
  const { data, loading, error, reload } = useApi<{ mistakes: Mistake[] }>("/api/mistakes");
  const mistakes = data?.mistakes ?? null;
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);

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

  return (
    <Shell>
      {actionError && <p role="alert" className="mb-4 text-sm text-(--coral)">We couldn&apos;t update that mistake. Please try again.</p>}
      {loading ? (
        <LoadingState label="Loading your mistakes"><div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /></div></LoadingState>
      ) : error || !mistakes ? (
        <Card><ErrorState title="We couldn't load your Mistake Book" onRetry={reload} /></Card>
      ) : mistakes.length === 0 ? (
        <div className="fade-in text-center py-20 max-w-sm mx-auto">
          <BookMarked size={36} className="mx-auto text-(--ink-soft) mb-3" />
          <h2 className="disp text-xl font-bold mb-1">No mistakes yet</h2>
          <p className="text-sm text-(--ink-soft)">Once you practise or take a test, anything you get wrong will show up here so you can master it later.</p>
        </div>
      ) : (
        <div className="fade-in space-y-4">
          <h1 className="disp text-3xl font-bold">My Mistakes</h1>
          {mistakes.map((m) => (
            <div key={m.id} className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
              <Pill tone="coral">{m.topic}</Pill>
              <p className="font-medium mt-2">{m.question}</p>
              <p className="text-sm text-(--coral) mt-1"><XCircle size={14} className="inline mr-1" />Your answer: {m.chosen}</p>
              <p className="text-sm text-(--green)"><CheckCircle2 size={14} className="inline mr-1" />Correct: {m.correct}</p>
              <p className="text-xs text-(--ink-soft) mt-1">{m.explanation}</p>
              <div className="flex items-center gap-2 mt-3">
                <button type="button" disabled={pending === m.id} onClick={() => markMastered(m.id)} className="tap text-xs font-semibold px-3 py-1.5 rounded-full min-h-9 disabled:opacity-50" style={{ background: "var(--green-soft)", color: "var(--green)" }}>Mark as Mastered</button>
                <Link href={`/ai?mistakeId=${m.id}`} className="tap flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full min-h-9" style={{ background: "var(--primary-soft)", color: "var(--primary-deep)" }}>
                  <Sparkles size={12} /> Ask Msingi why
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
