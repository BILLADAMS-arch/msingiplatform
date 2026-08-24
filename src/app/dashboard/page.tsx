"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { StatCard, FoundationBar } from "@/components/ui";
import { Flame, Star, Layers, Target, Trophy, Sparkles } from "lucide-react";

type ProgressResponse = {
  profile: { name: string; xp: number; streak: number; goal: string | null } | null;
  topicMastery: Record<string, number>;
  subjectMastery: Record<string, number>;
  testHistory: { date: string; score: number; testTitle: string }[];
  achievements: { unlocked: { code: string; label: string; icon: string }[]; all: { code: string; label: string; icon: string }[] };
  openMistakeCount: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<ProgressResponse | null>(null);

  useEffect(() => { fetch("/api/progress/me").then((r) => r.json()).then(setData); }, []);

  const weakTopics = data ? Object.entries(data.topicMastery).filter(([, v]) => v > 0 && v < 60) : [];
  const overallProgress = data && Object.values(data.subjectMastery).length
    ? Math.round(Object.values(data.subjectMastery).reduce((a, b) => a + b, 0) / Object.values(data.subjectMastery).length)
    : 0;
  const avgScore = data && data.testHistory.length ? Math.round(data.testHistory.reduce((a, t) => a + t.score, 0) / data.testHistory.length) : null;

  return (
    <Shell name={data?.profile?.name} xp={data?.profile?.xp} streak={data?.profile?.streak}>
      <div className="fade-in space-y-8">
        <div>
          <h1 className="disp text-2xl font-bold">Good morning, {data?.profile?.name || "learner"} 👋</h1>
          <p className="text-[--ink-soft] text-sm mt-1">Ready to continue learning?</p>
        </div>

        {!data ? (
          <p className="text-sm text-[--ink-soft]">Loading your dashboard…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard icon={<Flame size={18} />} label="Learning Streak" value={`${data.profile?.streak ?? 1}d`} tone="coral" />
              <StatCard icon={<Star size={18} />} label="XP" value={data.profile?.xp ?? 0} tone="gold" />
              <StatCard icon={<Layers size={18} />} label="Overall Progress" value={`${overallProgress}%`} tone="green" />
              <StatCard icon={<Target size={18} />} label="Avg Score" value={avgScore !== null ? `${avgScore}%` : "—"} tone="gold" />
              <StatCard icon={<Trophy size={18} />} label="Achievements" value={data.achievements.unlocked.length} tone="green" />
            </div>

            <div className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="disp font-bold">Continue Learning</h3>
                <Link href="/learn" className="text-xs font-semibold text-[--gold-deep]">See all</Link>
              </div>
              <div className="flex items-center justify-between bg-[--stone-2] rounded-xl p-4">
                <div>
                  <div className="text-xs text-[--ink-soft] mb-0.5">Mathematics</div>
                  <div className="font-semibold">Fractions</div>
                  <div className="w-40 mt-2"><FoundationBar pct={data.topicMastery["Fractions"] || 0} /></div>
                  <div className="text-xs text-[--ink-soft] mt-1">{data.topicMastery["Fractions"] || 0}% mastery</div>
                </div>
                <Link href="/learn" className="tap px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ background: "var(--gold-deep)" }}>Continue</Link>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
                <h3 className="disp font-bold mb-3 flex items-center gap-2"><Sparkles size={16} className="text-[--gold-deep]" /> Recommended For You</h3>
                {weakTopics.length > 0 ? (
                  <div className="space-y-2">
                    {weakTopics.map(([t, v]) => (
                      <div key={t} className="flex items-center justify-between text-sm">
                        <span>Revise <b>{t}</b> — {v}% mastery</span>
                        <Link href={`/practice?topic=${encodeURIComponent(t)}`} className="text-xs font-semibold text-[--gold-deep]">Revise</Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[--ink-soft]">Take your first test to unlock personalised recommendations.</p>
                )}
                {data.openMistakeCount > 0 && (
                  <Link href="/mistakes" className="text-xs font-semibold text-[--coral] mt-3 inline-block">
                    Review {data.openMistakeCount} saved mistake{data.openMistakeCount === 1 ? "" : "s"} →
                  </Link>
                )}
              </div>

              <div className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
                <h3 className="disp font-bold mb-3">Recent Tests</h3>
                {data.testHistory.length ? (
                  <div className="space-y-2">
                    {data.testHistory.slice(0, 4).map((t, i) => (
                      <div key={i} className="flex items-center justify-between text-sm border-b last:border-0 py-1.5" style={{ borderColor: "var(--stone-2)" }}>
                        <span className="text-[--ink-soft]">{t.testTitle}</span>
                        <span className="font-semibold">{t.score}%</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-[--ink-soft]">No tests taken yet — start with a lesson.</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
