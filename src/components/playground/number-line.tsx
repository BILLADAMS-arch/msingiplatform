"use client";
import { useState } from "react";
import { Shuffle } from "lucide-react";

const MIN = -10, MAX = 10;

export function NumberLine({ onFirstUse }: { onFirstUse: () => void }) {
  const [target, setTarget] = useState(() => Math.floor(Math.random() * (MAX - MIN + 1)) + MIN);
  const [guess, setGuess] = useState<number | null>(null);
  const [used, setUsed] = useState(false);

  function place(value: number) {
    setGuess(value);
    if (!used) { setUsed(true); onFirstUse(); }
  }

  function newTarget() {
    setTarget(Math.floor(Math.random() * (MAX - MIN + 1)) + MIN);
    setGuess(null);
  }

  const correct = guess === target;
  const marks = Array.from({ length: MAX - MIN + 1 }, (_, i) => MIN + i);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="disp text-xl font-bold">Find <span style={{ color: "var(--primary)" }}>{target}</span> on the number line</div>
        {guess !== null && <div className={`text-sm font-semibold mt-1 ${correct ? "text-[--green]" : "text-[--coral]"}`}>{correct ? "Correct! 🎉" : `You placed ${guess} — try again.`}</div>}
      </div>

      <div className="relative py-6">
        <div className="absolute left-0 right-0 top-1/2 h-0.5" style={{ background: "var(--slate)" }} />
        <div className="flex justify-between relative">
          {marks.map((v) => (
            <button key={v} onClick={() => place(v)} className="tap flex flex-col items-center gap-1" style={{ width: `${100 / marks.length}%` }}>
              <div className="w-0.5 h-3" style={{ background: "var(--slate)" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: guess === v ? (correct ? "var(--green)" : "var(--coral)") : "white", border: "2px solid var(--slate)" }} />
              <span className="text-[10px] text-[--ink-soft]">{v}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <button onClick={newTarget} className="tap flex items-center gap-1 px-4 py-2.5 rounded-full font-semibold text-sm border" style={{ borderColor: "var(--slate)" }}>
          <Shuffle size={14} /> New number
        </button>
      </div>
    </div>
  );
}
