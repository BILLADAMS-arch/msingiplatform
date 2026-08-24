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

export default function PlaygroundPage() {
  const [activities, setActivities] = useState<Activity[] | null>(null);

  useEffect(() => { fetch("/api/playground").then((r) => r.json()).then((d) => setActivities(d.activities)); }, []);

  const byArea = AREA_ORDER.map((area) => ({ area, items: activities?.filter((a) => a.area === area) ?? [] })).filter((g) => g.items.length);

  return (
    <Shell>
      <div className="fade-in space-y-8">
        <div>
          <h1 className="disp text-2xl font-bold">Msingi Playground</h1>
          <p className="text-sm text-[--ink-soft]">A digital laboratory for hands-on learning — explore, don&apos;t just read.</p>
        </div>

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
    </Shell>
  );
}
