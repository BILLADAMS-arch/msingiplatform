"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { ErrorState, Skeleton, LoadingState } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import { ChevronLeft } from "lucide-react";
import { PLAYGROUND_REGISTRY } from "@/components/playground/registry";

type Activity = { id: string; title: string; description: string; slug: string | null };

export default function PlaygroundActivityPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error, reload } = useApi<{ activities: Activity[] }>("/api/playground");
  const activity = data ? (data.activities.find((a) => a.slug === slug) ?? null) : undefined;

  const Component = PLAYGROUND_REGISTRY[slug];

  async function markFirstUse() {
    if (!activity) return;
    await fetch(`/api/playground/${activity.id}/complete`, { method: "POST" });
  }

  return (
    <Shell>
      <div className="fade-in max-w-2xl mx-auto space-y-5">
        <Link href="/playground" className="tap flex items-center gap-1 text-xs font-semibold text-(--ink-soft)"><ChevronLeft size={14} /> Playground</Link>

        {loading ? (
          <LoadingState label="Loading activity"><div className="space-y-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-72 rounded-2xl" /></div></LoadingState>
        ) : error || activity === undefined ? (
          <ErrorState title="We couldn't load this activity" onRetry={reload} />
        ) : !activity || !Component ? (
          <div className="text-center py-16">
            <h1 className="disp text-xl font-bold mb-1">Activity not found</h1>
            <p className="text-sm text-(--ink-soft)">This one isn&apos;t available yet — check back soon.</p>
          </div>
        ) : (
          <>
            <div>
              <h1 className="disp text-3xl font-bold">{activity.title}</h1>
              <p className="text-sm text-(--ink-soft) mt-1">{activity.description}</p>
            </div>
            <div className="brick bg-(--stone-2) rounded-2xl p-5">
              <Component onFirstUse={markFirstUse} />
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
