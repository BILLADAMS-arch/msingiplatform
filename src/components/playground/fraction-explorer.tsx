"use client";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }

export function FractionExplorer({ onFirstUse }: { onFirstUse: () => void }) {
  const [numerator, setNumerator] = useState(3);
  const [denominator, setDenominator] = useState(4);
  const [used, setUsed] = useState(false);

  const g = gcd(numerator, denominator);
  const simplified = { n: numerator / g, d: denominator / g };
  const isSimplified = g === 1;
  const equivalent = { n: numerator * 2, d: denominator * 2 };

  function stepper(label: string, value: number, setValue: (v: number) => void) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium w-24">{label}</span>
        <button onClick={() => setValue(Math.max(1, value - 1))} className="tap w-8 h-8 rounded-full border flex items-center justify-center" style={{ borderColor: "var(--slate)" }}><Minus size={14} /></button>
        <span className="disp text-xl font-bold w-8 text-center">{value}</span>
        <button onClick={() => setValue(Math.min(12, value + 1))} className="tap w-8 h-8 rounded-full border flex items-center justify-center" style={{ borderColor: "var(--slate)" }}><Plus size={14} /></button>
      </div>
    );
  }

  function markUsed() {
    if (!used) { setUsed(true); onFirstUse(); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        {stepper("Numerator", numerator, (v) => { setNumerator(Math.min(v, denominator)); markUsed(); })}
        {stepper("Denominator", denominator, (v) => { setDenominator(Math.max(v, numerator)); markUsed(); })}
      </div>

      <div>
        <div className="text-xs text-[--ink-soft] mb-2">{numerator}/{denominator} of the bar is filled</div>
        <div className="flex gap-1 h-16 rounded-xl overflow-hidden border" style={{ borderColor: "var(--slate)" }}>
          {Array.from({ length: denominator }, (_, i) => (
            <div key={i} className="flex-1 h-full border-r last:border-r-0" style={{ borderColor: "var(--stone-2)", background: i < numerator ? "var(--gold-deep)" : "var(--stone-2)" }} />
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: "var(--slate)" }}>
          <div className="text-xs text-[--ink-soft] mb-1">Simplified form</div>
          <div className="disp text-2xl font-bold">{simplified.n}/{simplified.d}</div>
          <div className="text-xs text-[--ink-soft] mt-1">{isSimplified ? "Already in simplest form" : `Divide both by ${g}`}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: "var(--slate)" }}>
          <div className="text-xs text-[--ink-soft] mb-1">An equivalent fraction</div>
          <div className="disp text-2xl font-bold">{equivalent.n}/{equivalent.d}</div>
          <div className="text-xs text-[--ink-soft] mt-1">Multiply both by 2</div>
        </div>
      </div>
    </div>
  );
}
