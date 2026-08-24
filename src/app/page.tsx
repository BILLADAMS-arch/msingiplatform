import Link from "next/link";
import { Pill, FoundationBar } from "@/components/ui";

export default function Landing() {
  return (
    <div className="msingi min-h-screen">
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center disp font-bold text-white" style={{ background: "var(--ink)" }}>M</div>
          <span className="disp font-bold text-lg tracking-tight">Msingi</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-[--ink-soft]">Log in</Link>
          <Link href="/register" className="tap px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ background: "var(--ink)" }}>Start Learning</Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-14 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <div className="fade-in">
          <Pill tone="gold">Built for the Kenyan CBC</Pill>
          <h1 className="disp text-5xl md:text-6xl font-bold leading-[1.05] mt-5">Learn. Practise.<br />Grow.</h1>
          <p className="text-[--ink-soft] text-lg mt-5 max-w-md">Msingi is your complete CBC learning playground — helping learners understand concepts, practise confidently, test their knowledge and improve every day.</p>
          <div className="flex gap-3 mt-8">
            <Link href="/register" className="tap px-6 py-3 rounded-full font-semibold text-white" style={{ background: "var(--gold-deep)" }}>Start Learning</Link>
            <Link href="/register" className="tap px-6 py-3 rounded-full font-semibold border" style={{ borderColor: "var(--ink)" }}>Explore CBC</Link>
          </div>
        </div>
        <div className="relative fade-in">
          <div className="brick bg-white rounded-3xl p-6 shadow-lg border" style={{ borderColor: "var(--slate)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="disp font-bold">Fractions — Grade 7</span>
              <Pill tone="green">On track</Pill>
            </div>
            <FoundationBar pct={72} tone="green" height={12} />
            <div className="grid grid-cols-3 gap-2 mt-5">
              {["Numbers", "Fractions", "Decimals"].map((t, i) => (
                <div key={t} className="text-center text-xs bg-[--stone-2] rounded-lg py-2 font-medium">{i < 2 ? "✓ " : ""}{t}</div>
              ))}
            </div>
          </div>
          <div className="absolute -top-6 -right-4 bg-white rounded-2xl shadow-md px-4 py-2 text-xs font-semibold border pulse-ring" style={{ borderColor: "var(--slate)" }}>92% Test Score</div>
          <div className="absolute -bottom-5 -left-6 bg-white rounded-2xl shadow-md px-4 py-2 text-xs font-semibold border" style={{ borderColor: "var(--slate)" }}>🔥 7 Day Streak</div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="disp text-2xl font-bold text-center mb-10">Why Msingi?</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { t: "Learn", d: "Interactive curriculum-aligned lessons." },
            { t: "Practise", d: "Unlimited questions with instant feedback." },
            { t: "Test", d: "Timed assessments that measure understanding." },
            { t: "Improve", d: "Automatically find weak areas and target revision." },
          ].map((c) => (
            <div key={c.t} className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
              <div className="font-semibold mb-1">{c.t}</div>
              <div className="text-sm text-[--ink-soft]">{c.d}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center py-16 border-t" style={{ borderColor: "var(--slate)" }}>
        <div className="disp text-3xl font-bold mb-2">Every learner needs a strong foundation.</div>
        <Link href="/register" className="tap inline-block mt-6 px-6 py-3 rounded-full font-semibold text-white" style={{ background: "var(--ink)" }}>Start Learning</Link>
      </div>
    </div>
  );
}
