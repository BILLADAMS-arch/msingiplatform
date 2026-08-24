"use client";
import { useState } from "react";
import { Pause, Play } from "lucide-react";

const PLANETS = [
  { name: "Mercury", color: "#a8a29e", radius: 46, duration: 4, fact: "The closest planet to the Sun — a year on Mercury lasts just 88 Earth days." },
  { name: "Venus", color: "#eab676", radius: 62, duration: 6, fact: "The hottest planet, because its thick atmosphere traps heat like a blanket." },
  { name: "Earth", color: "#4d8fac", radius: 78, duration: 8, fact: "The only known planet with life — about 71% of its surface is covered by ocean." },
  { name: "Mars", color: "#c1440e", radius: 94, duration: 10, fact: "Called the Red Planet because iron oxide (rust) covers its soil." },
  { name: "Jupiter", color: "#c99039", radius: 116, duration: 14, fact: "The largest planet — its Great Red Spot is a storm bigger than Earth." },
  { name: "Saturn", color: "#d9c27e", radius: 138, duration: 18, fact: "Famous for its wide rings, made of billions of pieces of ice and rock." },
  { name: "Uranus", color: "#9fd1d6", radius: 158, duration: 22, fact: "Spins on its side, so each pole faces the Sun for years at a time." },
  { name: "Neptune", color: "#3f5eda", radius: 176, duration: 26, fact: "The windiest planet — storms there can reach over 2,000 km/h." },
];

export function SolarSystem({ onFirstUse }: { onFirstUse: () => void }) {
  const [selected, setSelected] = useState<typeof PLANETS[number] | null>(null);
  const [playing, setPlaying] = useState(true);
  const [used, setUsed] = useState(false);

  function selectPlanet(p: typeof PLANETS[number]) {
    setSelected(p);
    if (!used) { setUsed(true); onFirstUse(); }
  }

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes msingi-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .msingi-orbit-ring { position: absolute; top: 50%; left: 50%; border-radius: 9999px; border: 1px dashed var(--stone-2); transform: translate(-50%, -50%); }
        .msingi-orbit-spin { position: absolute; top: 50%; left: 50%; width: 100%; height: 100%; animation: msingi-orbit linear infinite; }
      `}</style>

      <div className="flex justify-end">
        <button onClick={() => setPlaying((p) => !p)} className="tap flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border" style={{ borderColor: "var(--slate)" }}>
          {playing ? <Pause size={12} /> : <Play size={12} />} {playing ? "Pause" : "Play"}
        </button>
      </div>

      <div className="relative mx-auto" style={{ width: 380, height: 380 }}>
        <div className="absolute rounded-full" style={{ width: 28, height: 28, background: "#f5b942", top: "50%", left: "50%", transform: "translate(-50%,-50%)", boxShadow: "0 0 24px 6px rgba(245,185,66,0.6)" }} />
        {PLANETS.map((p) => (
          <div key={p.name} className="msingi-orbit-ring" style={{ width: p.radius * 2, height: p.radius * 2 }}>
            <div className="msingi-orbit-spin" style={{ animationDuration: `${p.duration}s`, animationPlayState: playing ? "running" : "paused" }}>
              <button onClick={() => selectPlanet(p)} title={p.name}
                className="tap absolute rounded-full"
                style={{ width: 14, height: 14, background: p.color, top: 0, left: "50%", transform: "translate(-50%,-50%)", boxShadow: selected?.name === p.name ? "0 0 0 3px var(--gold-deep)" : "none" }} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-4 border min-h-20" style={{ borderColor: "var(--slate)" }}>
        {selected ? (
          <>
            <div className="font-semibold" style={{ color: selected.color }}>{selected.name}</div>
            <p className="text-sm text-[--ink-soft] mt-1">{selected.fact}</p>
          </>
        ) : (
          <p className="text-sm text-[--ink-soft]">Tap a planet to learn a fact about it.</p>
        )}
      </div>
    </div>
  );
}
