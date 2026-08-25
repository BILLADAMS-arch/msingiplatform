"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { ChevronLeft } from "lucide-react";
import { PLAYGROUND_REGISTRY } from "@/components/playground/registry";

type Activity = { id: string; title: string; description: string; slug: string | null };

export default function PlaygroundActivityPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activity, setActivity] = useState<Activity | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/playground").then((r) => r.json()).then((d) => {
      setActivity((d.activities as Activity[]).find((a) => a.slug === slug) ?? null);
    });
  }, [slug]);

  const Component = PLAYGROUND_REGISTRY[slug];

  async function markFirstUse() {
    if (!activity) return;
    await fetch(`/api/playground/${activity.id}/complete`, { method: "POST" });
  }

  return (
    <Shell>
      <div className="fade-in max-w-2xl mx-auto space-y-5">
        <Link href="/playground" className="tap flex items-center gap-1 text-xs font-semibold text-[--ink-soft]"><ChevronLeft size={14} /> Playground</Link>

        {activity === undefined ? (
          <p className="text-sm text-[--ink-soft]">Loading…</p>
        ) : !activity || !Component ? (
          <div className="text-center py-16">
            <h1 className="disp text-xl font-bold mb-1">Activity not found</h1>
            <p className="text-sm text-[--ink-soft]">This one isn&apos;t available yet — check back soon.</p>
          </div>
        ) : (
          <>
            <div>
              <h1 className="disp text-3xl font-bold">{activity.title}</h1>
              <p className="text-sm text-[--ink-soft] mt-1">{activity.description}</p>
            </div>
            <div className="brick bg-[--stone-2] rounded-2xl p-5">
              <Component onFirstUse={markFirstUse} />
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
