"use client";
import { useState } from "react";

export function GeometryLab({ onFirstUse }: { onFirstUse: () => void }) {
  const [shape, setShape] = useState<"rectangle" | "triangle">("rectangle");
  const [width, setWidth] = useState(8);
  const [height, setHeight] = useState(5);
  const [used, setUsed] = useState(false);

  function touch() { if (!used) { setUsed(true); onFirstUse(); } }

  const area = shape === "rectangle" ? width * height : (width * height) / 2;
  const perimeter = shape === "rectangle" ? 2 * (width + height) : null;
  const scale = 16;

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-2">
        {(["rectangle", "triangle"] as const).map((s) => (
          <button key={s} onClick={() => { setShape(s); touch(); }} className={`tap px-4 py-2 rounded-full border text-sm font-semibold capitalize ${shape === s ? "text-white" : ""}`}
            style={{ borderColor: shape === s ? "var(--primary)" : "var(--slate)", background: shape === s ? "var(--primary)" : "white" }}>
            {s}
          </button>
        ))}
      </div>

      <div className="flex justify-center items-end" style={{ height: 200 }}>
        {shape === "rectangle" ? (
          <div style={{ width: width * scale, height: height * scale, background: "var(--primary-soft)", border: "2px solid var(--primary)" }} />
        ) : (
          <div style={{ width: 0, height: 0, borderLeft: `${(width * scale) / 2}px solid transparent`, borderRight: `${(width * scale) / 2}px solid transparent`, borderBottom: `${height * scale}px solid var(--primary-soft)` }} />
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-[--ink-soft] mb-1"><span>Base / Width</span><span>{width}</span></div>
          <input type="range" min={2} max={12} value={width} onChange={(e) => { setWidth(Number(e.target.value)); touch(); }} className="w-full" />
        </div>
        <div>
          <div className="flex justify-between text-xs text-[--ink-soft] mb-1"><span>Height</span><span>{height}</span></div>
          <input type="range" min={2} max={10} value={height} onChange={(e) => { setHeight(Number(e.target.value)); touch(); }} className="w-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-white rounded-xl p-3 border" style={{ borderColor: "var(--slate)" }}>
          <div className="disp text-xl font-bold">{area}</div>
          <div className="text-xs text-[--ink-soft]">Area (units²)</div>
        </div>
        <div className="bg-white rounded-xl p-3 border" style={{ borderColor: "var(--slate)" }}>
          <div className="disp text-xl font-bold">{perimeter ?? "—"}</div>
          <div className="text-xs text-[--ink-soft]">Perimeter (units)</div>
        </div>
      </div>
      <p className="text-xs text-[--ink-soft] text-center">
        {shape === "rectangle" ? "Area = width × height. Perimeter = 2 × (width + height)." : "Area = ½ × base × height."}
      </p>
    </div>
  );
}
