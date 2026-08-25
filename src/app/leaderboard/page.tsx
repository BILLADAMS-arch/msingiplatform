"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Trophy } from "lucide-react";

type Row = { rank: number; name: string; xp: number; isMe: boolean };
type Data = { rows: Row[]; myRank: number | null; optedOut: boolean };

const MEDAL = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => { fetch("/api/leaderboard").then((r) => r.json()).then(setData); }, []);

  return (
    <Shell>
      <div className="fade-in max-w-lg mx-auto space-y-5">
        <div className="text-center">
          <Trophy size={32} className="mx-auto text-[--gold-deep] mb-2" />
          <h1 className="disp text-3xl font-bold">Leaderboard</h1>
          <p className="text-sm text-[--ink-soft]">Ranked by total XP, within your grade.</p>
        </div>

        {data?.optedOut && (
          <div className="text-center text-sm bg-[--stone-2] rounded-xl p-3">
            You&apos;ve hidden yourself from leaderboards. Change this in your <Link href="/profile" className="font-semibold text-[--primary]">Profile</Link>.
          </div>
        )}

        {!data ? <p className="text-sm text-[--ink-soft] text-center">Loading…</p> : data.rows.length === 0 ? (
          <p className="text-sm text-[--ink-soft] text-center">No ranked students yet.</p>
        ) : (
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "var(--slate)" }}>
            {data.rows.map((r) => (
              <div key={r.rank} className="flex items-center justify-between px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--stone-2)", background: r.isMe ? "var(--amber-soft)" : "white" }}>
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-semibold text-sm">{MEDAL[r.rank - 1] ?? r.rank}</span>
                  <span className={`text-sm ${r.isMe ? "font-bold" : "font-medium"}`}>{r.name}{r.isMe ? " (you)" : ""}</span>
                </div>
                <span className="text-sm font-semibold text-[--gold-deep]">{r.xp} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
