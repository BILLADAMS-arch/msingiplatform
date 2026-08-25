"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Pill } from "@/components/ui";
import { BookMarked, XCircle, CheckCircle2, Sparkles } from "lucide-react";

type Mistake = { id: string; question: string; topic: string; chosen: string; correct?: string; explanation: string; date: string };

export default function MistakesPage() {
  const [mistakes, setMistakes] = useState<Mistake[] | null>(null);
  const load = () => fetch("/api/mistakes").then((r) => r.json()).then((d) => setMistakes(d.mistakes));
  useEffect(() => { load(); }, []);

  async function markMastered(id: string) {
    await fetch(`/api/mistakes/${id}`, { method: "PATCH" });
    load();
  }

  return (
    <Shell>
      {!mistakes ? <p className="text-sm text-[--ink-soft]">Loading…</p> : mistakes.length === 0 ? (
        <div className="fade-in text-center py-20 max-w-sm mx-auto">
          <BookMarked size={36} className="mx-auto text-[--ink-soft] mb-3" />
          <h2 className="disp text-xl font-bold mb-1">No mistakes yet</h2>
          <p className="text-sm text-[--ink-soft]">Once you practise or take a test, anything you get wrong will show up here so you can master it later.</p>
        </div>
      ) : (
        <div className="fade-in space-y-4">
          <h1 className="disp text-3xl font-bold">My Mistakes</h1>
          {mistakes.map((m) => (
            <div key={m.id} className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
              <Pill tone="coral">{m.topic}</Pill>
              <p className="font-medium mt-2">{m.question}</p>
              <p className="text-sm text-[--coral] mt-1"><XCircle size={14} className="inline mr-1" />Your answer: {m.chosen}</p>
              <p className="text-sm text-[--green]"><CheckCircle2 size={14} className="inline mr-1" />Correct: {m.correct}</p>
              <p className="text-xs text-[--ink-soft] mt-1">{m.explanation}</p>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={() => markMastered(m.id)} className="tap text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "var(--green-soft)", color: "var(--green)" }}>Mark as Mastered</button>
                <Link href={`/ai?mistakeId=${m.id}`} className="tap flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "var(--primary-soft)", color: "var(--primary-deep)" }}>
                  <Sparkles size={12} /> Ask Msingi AI
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
