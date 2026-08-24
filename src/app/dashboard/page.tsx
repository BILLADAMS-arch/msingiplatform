"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { StatCard, FoundationBar } from "@/components/ui";
import { Flame, Star, Layers, Target, Trophy, Sparkles, Zap, CheckCircle2 } from "lucide-react";

type ProgressResponse = {
  profile: { name: string; xp: number; streak: number; goal: string | null } | null;
  topicMastery: Record<string, number>;
  subjectMastery: Record<string, number>;
  testHistory: { date: string; score: number; testTitle: string }[];
  achievements: { unlocked: { code: string; label: string; icon: string }[]; all: { code: string; label: string; icon: string }[] };
  openMistakeCount: number;
};

type Challenge = { targetCount: number; correctStreak: number; completed: boolean };
type ContinueLearning = { subjectName: string; topicName: string; lessonId: string; masteryPct: number } | null;

export default function DashboardPage() {
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [continueLearning, setContinueLearning] = useState<ContinueLearning>(null);
  const [continueLoaded, setContinueLoaded] = useState(false);

  useEffect(() => { fetch("/api/progress/me").then((r) => r.json()).then(setData); }, []);
  useEffect(() => { fetch("/api/challenges/today").then((r) => r.json()).then(setChallenge); }, []);

  // Picks a real "continue where you left off" topic across every subject in
  // the learner's grade — no subject/topic is hardcoded, so this works
  // however many subjects the admin CMS has added.
  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then(async (p) => {
      if (!p.gradeName) { setContinueLoaded(true); return; }
      const subjRes = await fetch(`/api/curriculum/subjects?grade=${encodeURIComponent(p.gradeName)}`).then((r) => r.json());
      const subjects: { id: string; name: string }[] = subjRes.subjects ?? [];
      const perSubject = await Promise.all(subjects.map(async (s) => {
        const roadmap = await fetch(`/api/curriculum/roadmap?subjectId=${s.id}`).then((r) => r.json());
        return (roadmap.roadmap ?? []).map((t: { name: string; lessonId: string | null; masteryPct: number }) => ({ ...t, subjectName: s.name }));
      }));
      const topics = perSubject.flat().filter((t) => t.lessonId);
      const inProgress = topics.filter((t) => t.masteryPct > 0 && t.masteryPct < 70).sort((a, b) => a.masteryPct - b.masteryPct);
      const notStarted = topics.filter((t) => t.masteryPct === 0);
      const pick = inProgress[0] ?? notStarted[0] ?? null;
      setContinueLearning(pick ? { subjectName: pick.subjectName, topicName: pick.name, lessonId: pick.lessonId, masteryPct: pick.masteryPct } : null);
      setContinueLoaded(true);
    });
  }, []);

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
              {!continueLoaded ? (
                <p className="text-sm text-[--ink-soft]">Loading…</p>
              ) : continueLearning ? (
                <div className="flex items-center justify-between bg-[--stone-2] rounded-xl p-4">
                  <div>
                    <div className="text-xs text-[--ink-soft] mb-0.5">{continueLearning.subjectName}</div>
                    <div className="font-semibold">{continueLearning.topicName}</div>
                    <div className="w-40 mt-2"><FoundationBar pct={continueLearning.masteryPct} /></div>
                    <div className="text-xs text-[--ink-soft] mt-1">{continueLearning.masteryPct}% mastery</div>
                  </div>
                  <Link href={`/learn/lesson/${continueLearning.lessonId}`} className="tap px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ background: "var(--gold-deep)" }}>Continue</Link>
                </div>
              ) : (
                <p className="text-sm text-[--ink-soft]">You&apos;re all caught up — no lessons waiting right now.</p>
              )}
            </div>

            {challenge && (
              <div className="brick rounded-2xl p-5 border" style={{ borderColor: "var(--gold-deep)", background: "var(--amber-soft)" }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="disp font-bold flex items-center gap-2"><Zap size={16} className="text-[--gold-deep]" /> Today&apos;s Challenge</h3>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white text-[--gold-deep]">+100 XP</span>
                </div>
                {challenge.completed ? (
                  <p className="text-sm font-medium flex items-center gap-2 text-[--green]"><CheckCircle2 size={16} /> Challenge complete — nice work! Come back tomorrow for a new one.</p>
                ) : (
                  <>
                    <p className="text-sm text-[--ink-soft] mb-2">Can you answer {challenge.targetCount} practice questions in a row without a mistake?</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1"><FoundationBar pct={(challenge.correctStreak / challenge.targetCount) * 100} tone="gold" /></div>
                      <span className="text-xs font-semibold whitespace-nowrap">{challenge.correctStreak}/{challenge.targetCount}</span>
                    </div>
                    <Link href="/practice" className="tap inline-block mt-3 px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ background: "var(--gold-deep)" }}>Take the Challenge</Link>
                  </>
                )}
              </div>
            )}

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
