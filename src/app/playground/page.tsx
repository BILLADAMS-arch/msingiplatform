"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Pill } from "@/components/ui";
import { PLAYGROUND_REGISTRY } from "@/components/playground/registry";

type Activity = { id: string; area: string; title: string; description: string; slug: string | null };

const AREA_LABEL: Record<string, string> = { mathematics: "Mathematics", science: "Science", computer: "Computer", language: "Language" };
const AREA_ICON: Record<string, string> = { mathematics: "➗", science: "🌍", computer: "💻", language: "🗣️" };
const AREA_ORDER = ["mathematics", "science", "computer", "language"];

const HERO_PHOTOS = Array.from({ length: 7 }, (_, i) => `/playground${i + 1}.jpeg`);

function PlaygroundHero() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((n) => (n + 1) % HERO_PHOTOS.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative rounded-3xl overflow-hidden border shadow-sm h-48 sm:h-64 md:h-72" style={{ borderColor: "var(--slate)", background: "var(--ink)" }}>
      {HERO_PHOTOS.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="" aria-hidden={i !== active} className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === active ? 1 : 0 }} />
      ))}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(0deg, rgba(16,27,74,0.7), rgba(16,27,74,0.05) 55%)" }} />
      <div className="absolute inset-0 flex items-end p-5 pointer-events-none">
        <div className="text-white">
          <div className="disp font-bold text-lg sm:text-2xl">Learn <span className="opacity-70">→</span> Experiment <span className="opacity-70">→</span> Discover</div>
          <div className="text-xs sm:text-sm opacity-90 mt-0.5">A hands-on digital lab for every subject.</div>
        </div>
      </div>

      <div className="hidden sm:flex absolute top-4 left-4 items-center gap-1.5 bg-white/95 rounded-full pl-2.5 pr-3 py-1.5 text-xs font-semibold shadow-md">🧮 Mathematics</div>
      <div className="hidden sm:flex absolute top-4 right-4 items-center gap-1.5 bg-white/95 rounded-full pl-2.5 pr-3 py-1.5 text-xs font-semibold shadow-md">🔬 Science</div>
      <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 left-4 items-center gap-1.5 bg-white/95 rounded-full pl-2.5 pr-3 py-1.5 text-xs font-semibold shadow-md">💻 Coding</div>
      <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 right-4 items-center gap-1.5 bg-white/95 rounded-full pl-2.5 pr-3 py-1.5 text-xs font-semibold shadow-md">📚 Reading</div>

      <div className="absolute -bottom-4 -right-3 sm:right-6 bg-white rounded-2xl shadow-md px-3 py-1.5 text-xs font-semibold border pulse-ring" style={{ borderColor: "var(--slate)" }}>🎯 92% Score</div>
      <div className="absolute -bottom-4 -left-3 sm:left-6 bg-white rounded-2xl shadow-md px-3 py-1.5 text-xs font-semibold border" style={{ borderColor: "var(--slate)" }}>🔥 7 Day Streak</div>

      <div className="absolute bottom-3 right-4 flex gap-1">
        {HERO_PHOTOS.map((_, i) => (
          <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === active ? "white" : "rgba(255,255,255,0.4)" }} />
        ))}
      </div>
    </div>
  );
}

export default function PlaygroundPage() {
  const [activities, setActivities] = useState<Activity[] | null>(null);

  useEffect(() => { fetch("/api/playground").then((r) => r.json()).then((d) => setActivities(d.activities)); }, []);

  const byArea = AREA_ORDER.map((area) => ({ area, items: activities?.filter((a) => a.area === area) ?? [] })).filter((g) => g.items.length);

  return (
    <Shell>
      <div className="fade-in space-y-6">
        <PlaygroundHero />

        <div>
          <h1 className="disp text-3xl font-bold">Msingi Playground</h1>
          <p className="text-sm text-[--ink-soft]">A digital laboratory for hands-on learning — explore, don&apos;t just read.</p>
        </div>

        <div className="rounded-3xl p-4 sm:p-6 space-y-8" style={{ background: "var(--stone-2)" }}>
          {!activities ? (
            <p className="text-sm text-[--ink-soft]">Loading…</p>
          ) : (
            byArea.map(({ area, items }) => (
              <div key={area}>
                <h3 className="disp font-bold mb-3">{AREA_ICON[area]} {AREA_LABEL[area] ?? area}</h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {items.map((it) => {
                    const built = it.slug && PLAYGROUND_REGISTRY[it.slug];
                    const card = (
                      <div className={`brick bg-white rounded-2xl p-5 border relative h-full ${built ? "" : "opacity-70"}`} style={{ borderColor: "var(--slate)" }}>
                        <div className="font-semibold text-sm">{it.title}</div>
                        <div className="text-xs text-[--ink-soft] mt-1">{it.description}</div>
                        <div className="mt-2"><Pill tone={built ? "green" : "gold"}>{built ? "Try it" : "Coming soon"}</Pill></div>
                      </div>
                    );
                    return built ? (
                      <Link key={it.id} href={`/playground/${it.slug}`} className="tap">{card}</Link>
                    ) : (
                      <div key={it.id} className="cursor-not-allowed">{card}</div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Shell>
  );
}
