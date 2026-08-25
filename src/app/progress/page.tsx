"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { StatCard, TopicChip } from "@/components/ui";
import { BarChart, LineChart } from "@/components/charts";
import { Layers, Star, Dumbbell, Flame, Trophy } from "lucide-react";

type ProgressResponse = {
  profile: { name: string; xp: number; streak: number; goal: string | null } | null;
  topicMastery: Record<string, number>;
  subjectMastery: Record<string, number>;
  testHistory: { date: string; score: number; testTitle: string }[];
  achievements: { unlocked: { code: string; label: string; icon: string }[]; all: { code: string; label: string; icon: string }[] };
  openMistakeCount: number;
};

const LEVELS = ["Beginner", "Explorer", "Learner", "Scholar", "Expert", "Master"];
function levelForXP(xp: number) { return LEVELS[Math.min(LEVELS.length - 1, Math.floor(xp / 500))]; }

export default function ProgressPage() {
  const [data, setData] = useState<ProgressResponse | null>(null);
  useEffect(() => { fetch("/api/progress/me").then((r) => r.json()).then(setData); }, []);

  return (
    <Shell name={data?.profile?.name} xp={data?.profile?.xp} streak={data?.profile?.streak}>
      <div className="fade-in space-y-6">
        <h1 className="disp text-2xl font-bold">My Progress</h1>
        {!data ? <p className="text-sm text-[--ink-soft]">Loading…</p> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={<Layers size={18} />} label="Level" value={levelForXP(data.profile?.xp ?? 0)} tone="gold" />
              <StatCard icon={<Star size={18} />} label="Total XP" value={data.profile?.xp ?? 0} tone="gold" />
              <StatCard icon={<Dumbbell size={18} />} label="Achievements" value={data.achievements.unlocked.length} tone="green" />
              <StatCard icon={<Flame size={18} />} label="Streak" value={`${data.profile?.streak ?? 1}d`} tone="coral" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
                <h3 className="disp font-bold mb-3">Subject Mastery</h3>
                {Object.keys(data.subjectMastery).length ? (
                  <BarChart tone="green" data={Object.entries(data.subjectMastery).map(([label, value]) => ({ label, value }))} />
                ) : <p className="text-sm text-[--ink-soft]">No subject mastery yet.</p>}
              </div>
              <div className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
                <h3 className="disp font-bold mb-3">Score Trend</h3>
                {data.testHistory.length >= 2 ? (
                  <LineChart data={[...data.testHistory].reverse().map((t) => ({ label: t.testTitle, value: t.score }))} />
                ) : <p className="text-sm text-[--ink-soft]">Take a few tests to see your score trend.</p>}
              </div>
            </div>

            <div className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
              <h3 className="disp font-bold mb-3">Topic Mastery</h3>
              <div className="space-y-2">
                {Object.entries(data.topicMastery).length ? Object.entries(data.topicMastery).map(([t, v]) => <TopicChip key={t} label={t} pct={v} />) : <p className="text-sm text-[--ink-soft]">Take a test to see topic-level mastery.</p>}
              </div>
            </div>

            <div className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
              <h3 className="disp font-bold mb-3">Test History</h3>
              {data.testHistory.length ? (
                <div className="space-y-2">
                  {data.testHistory.map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-sm border-b last:border-0 py-2" style={{ borderColor: "var(--stone-2)" }}>
                      <span className="text-[--ink-soft]">{new Date(t.date).toLocaleDateString()} · {t.testTitle}</span>
                      <span className="font-semibold">{t.score}%</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-[--ink-soft]">No tests taken yet.</p>}
            </div>

            <div className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
              <h3 className="disp font-bold mb-3 flex items-center gap-2"><Trophy size={16} className="text-[--gold-deep]" /> Achievements</h3>
              <div className="flex flex-wrap gap-3">
                {data.achievements.all.map((a) => {
                  const unlocked = data.achievements.unlocked.some((u) => u.code === a.code);
                  return (
                    <div key={a.code} className={`w-20 text-center ${unlocked ? "" : "opacity-30"}`}>
                      <div className="text-2xl">{a.icon}</div>
                      <div className="text-[10px] font-medium mt-1">{a.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
