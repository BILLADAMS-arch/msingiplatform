import Link from "next/link";
import { Pill } from "@/components/ui";

const HERO_PHOTOS = ["/hero1.jpeg", "/hero2.jpeg", "/hero3.jpeg", "/hero4.jpeg"];

export default function Landing() {
  return (
    <div className="msingi min-h-screen">
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.png" alt="Msingi" className="h-14 object-contain" />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-[--ink-soft]">Log in</Link>
          <Link href="/register" className="tap px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ background: "var(--primary)" }}>Start Learning</Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-14 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <div className="fade-in">
          <Pill tone="gold">Built for the Kenyan CBC</Pill>
          <h1 className="disp text-5xl md:text-6xl font-bold leading-[1.05] mt-5">Learn. Practise.<br />Grow.</h1>
          <p className="text-[--ink-soft] text-lg mt-5 max-w-md">Msingi is your complete CBC learning playground — helping learners understand concepts, practise confidently, test their knowledge and improve every day.</p>
          <div className="flex gap-3 mt-8">
            <Link href="/register" className="tap px-6 py-3 rounded-full font-semibold text-white" style={{ background: "var(--primary)" }}>Start Learning</Link>
            <Link href="/register" className="tap px-6 py-3 rounded-full font-semibold border" style={{ borderColor: "var(--primary)" }}>Explore CBC</Link>
          </div>
        </div>
        <div className="relative fade-in">
          <div className="relative rounded-3xl overflow-hidden shadow-lg border h-72 sm:h-80 md:h-[26rem]" style={{ borderColor: "var(--slate)" }}>
            {HERO_PHOTOS.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="A Msingi learner actively engaging with an interactive lesson on a tablet"
                className="hero-slide absolute inset-0 w-full h-full object-cover" style={{ animationDelay: `${-i * 4}s` }} />
            ))}
          </div>
          <div className="absolute -top-6 -right-4 bg-white rounded-2xl shadow-md px-4 py-2 text-xs font-semibold border pulse-ring" style={{ borderColor: "var(--slate)" }}>🎯 92% Test Score</div>
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
        <Link href="/register" className="tap inline-block mt-6 px-6 py-3 rounded-full font-semibold text-white" style={{ background: "var(--primary)" }}>Start Learning</Link>
      </div>
    </div>
  );
}
