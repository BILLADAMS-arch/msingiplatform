"use client";
import { useState } from "react";
import { Shuffle } from "lucide-react";

function randomEquation() {
  const a = 1 + Math.floor(Math.random() * 6); // 1-6
  const x = 1 + Math.floor(Math.random() * 8); // the (hidden) solution, 1-8
  const b = a + x;
  return { a, b };
}

function Block({ label }: { label: string }) {
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "var(--ink)" }}>
      {label}
    </div>
  );
}

export function AlgebraBalance({ onFirstUse }: { onFirstUse: () => void }) {
  const [{ a, b }, setEq] = useState(randomEquation);
  const [removed, setRemoved] = useState(0);
  const [usedFired, setUsedFired] = useState(false);

  const leftConst = a - removed;
  const rightConst = b - removed;
  const solved = leftConst === 0;

  function subtractOne() {
    if (leftConst <= 0) return;
    setRemoved((r) => r + 1);
    if (leftConst - 1 === 0 && !usedFired) { setUsedFired(true); onFirstUse(); }
  }

  function newEquation() {
    setEq(randomEquation());
    setRemoved(0);
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="disp text-2xl font-bold">x {leftConst > 0 ? `+ ${leftConst}` : ""} = {rightConst}</div>
        {solved && <div className="text-sm font-semibold text-[--green] mt-1">Solved! x = {rightConst}</div>}
      </div>

      <div className="flex items-end justify-center gap-1">
        <div className="w-40 h-16 border-b-4 rounded-b-lg" style={{ borderColor: "var(--gold-deep)" }} />
      </div>
      <div className="flex items-start justify-center gap-16 -mt-2">
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap gap-1.5 justify-center bg-white rounded-xl border p-3 min-h-16 w-32" style={{ borderColor: "var(--slate)" }}>
            <Block label="x" />
            {Array.from({ length: leftConst }, (_, i) => <Block key={i} label="1" />)}
          </div>
          <span className="text-xs text-[--ink-soft]">Left pan</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap gap-1.5 justify-center bg-white rounded-xl border p-3 min-h-16 w-32" style={{ borderColor: "var(--slate)" }}>
            {Array.from({ length: rightConst }, (_, i) => <Block key={i} label="1" />)}
          </div>
          <span className="text-xs text-[--ink-soft]">Right pan</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button disabled={solved} onClick={subtractOne} className="tap px-5 py-2.5 rounded-full font-semibold text-sm text-white disabled:opacity-40" style={{ background: "var(--ink)" }}>
          Remove 1 from both sides
        </button>
        <button onClick={newEquation} className="tap flex items-center gap-1 px-4 py-2.5 rounded-full font-semibold text-sm border" style={{ borderColor: "var(--slate)" }}>
          <Shuffle size={14} /> New equation
        </button>
      </div>
      <p className="text-xs text-[--ink-soft] text-center">Removing the same number from both pans keeps the balance level — that&apos;s how you isolate x.</p>
    </div>
  );
}
