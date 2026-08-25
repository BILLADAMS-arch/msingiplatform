"use client";
import { useState } from "react";

type State = "solid" | "liquid" | "gas";

const CONFIG: Record<State, { particles: number; speed: number; spread: number; fact: string }> = {
  solid: { particles: 24, speed: 8, spread: 6, fact: "Particles are packed tightly in a fixed pattern and only vibrate in place — that's why solids hold their shape." },
  liquid: { particles: 24, speed: 3, spread: 22, fact: "Particles stay close but can slide past each other — that's why liquids flow and take the shape of their container." },
  gas: { particles: 24, speed: 1, spread: 90, fact: "Particles have lots of energy and spread far apart, moving freely and quickly in every direction." },
};

// Deterministic per-particle unit offsets (-0.5..0.5), computed once at
// module scope with a pure trig-based pseudo-random formula — avoids calling
// Math.random() during render, which React's purity rules disallow even
// inside useMemo.
const UNIT_OFFSETS = Array.from({ length: 24 }, (_, i) => ({
  dx: (Math.sin(i * 12.9898) * 43758.5453) % 1,
  dy: (Math.sin(i * 78.233) * 43758.5453) % 1,
}));

export function StatesOfMatter({ onFirstUse }: { onFirstUse: () => void }) {
  const [state, setState] = useState<State>("solid");
  const [used, setUsed] = useState(false);
  const config = CONFIG[state];

  function select(s: State) {
    setState(s);
    if (!used) { setUsed(true); onFirstUse(); }
  }

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes msingi-jiggle { 0%,100% { transform: translate(0,0); } 25% { transform: translate(1px,-1px); } 50% { transform: translate(-1px,1px); } 75% { transform: translate(1px,1px); } }
        @keyframes msingi-drift { 0% { transform: translate(0,0); } 100% { transform: translate(var(--dx), var(--dy)); } }
      `}</style>

      <div className="flex justify-center gap-2">
        {(["solid", "liquid", "gas"] as State[]).map((s) => (
          <button key={s} onClick={() => select(s)} className={`tap px-4 py-2 rounded-full border text-sm font-semibold capitalize ${state === s ? "text-white" : ""}`}
            style={{ borderColor: state === s ? "var(--primary)" : "var(--slate)", background: state === s ? "var(--primary)" : "white" }}>
            {s}
          </button>
        ))}
      </div>

      <div className="relative mx-auto bg-white rounded-2xl border overflow-hidden" style={{ width: "100%", maxWidth: 320, height: 220, borderColor: "var(--slate)" }}>
        {Array.from({ length: config.particles }, (_, i) => {
          const row = Math.floor(i / 6), col = i % 6;
          const baseX = 20 + col * 46, baseY = 20 + row * 46;
          const dx = UNIT_OFFSETS[i].dx * config.spread, dy = UNIT_OFFSETS[i].dy * config.spread;
          return (
            <div key={`${state}-${i}`} className="absolute rounded-full" style={{
              width: 10, height: 10, background: "var(--primary)", left: baseX, top: baseY,
              animation: `msingi-${state === "solid" ? "jiggle" : "drift"} ${config.speed}s ease-in-out infinite alternate`,
              // @ts-expect-error CSS custom properties aren't in the style type
              "--dx": `${dx}px`, "--dy": `${dy}px`,
            }} />
          );
        })}
      </div>

      <p className="text-sm text-[--ink-soft] text-center max-w-sm mx-auto">{config.fact}</p>
    </div>
  );
}
