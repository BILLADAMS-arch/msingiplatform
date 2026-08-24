import { Shell } from "@/components/shell";
import { Pill } from "@/components/ui";

const ITEMS = [
  { icon: "➗", t: "Fraction Explorer", d: "Visually manipulate fractions." },
  { icon: "📏", t: "Number Line", d: "Drag values along a number line." },
  { icon: "🔺", t: "Geometry Lab", d: "Manipulate shapes." },
  { icon: "🌍", t: "Solar System Explorer", d: "Explore the planets." },
  { icon: "🧪", t: "States of Matter", d: "Interact with solids, liquids, gases." },
  { icon: "💻", t: "HTML Playground", d: "Basic HTML exercises." },
];

export default function PlaygroundPage() {
  return (
    <Shell>
      <div className="fade-in space-y-6">
        <div>
          <h1 className="disp text-2xl font-bold">Msingi Playground</h1>
          <p className="text-sm text-[--ink-soft]">A digital laboratory for hands-on learning. Activities are catalogued in the database (see Admin → Playground) but interactive builds land in Phase 3.</p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {ITEMS.map((it) => (
            <div key={it.t} className="brick bg-white rounded-2xl p-5 border relative" style={{ borderColor: "var(--slate)" }}>
              <div className="text-2xl mb-2">{it.icon}</div>
              <div className="font-semibold text-sm">{it.t}</div>
              <div className="text-xs text-[--ink-soft] mt-1">{it.d}</div>
              <div className="mt-2"><Pill tone="gold">Soon</Pill></div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
