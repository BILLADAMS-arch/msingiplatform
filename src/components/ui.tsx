"use client";
import { ReactNode } from "react";

export type Tone = "gold" | "green" | "coral" | "blue" | "warning";

export function Pill({ children, tone = "gold" }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    gold: "bg-[--amber-soft] text-[--gold-deep]",
    green: "bg-[--green-soft] text-[--green]",
    coral: "bg-[--coral-soft] text-[--coral]",
    blue: "bg-[--primary-soft] text-[--primary-deep]",
    warning: "bg-[--warning-soft] text-[--warning]",
  };
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function FoundationBar({ pct, tone = "blue", height = 10 }: { pct: number; tone?: Tone; height?: number }) {
  const colors: Record<Tone, string> = { gold: "var(--gold)", green: "var(--green)", coral: "var(--coral)", blue: "var(--primary)", warning: "var(--warning)" };
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: "var(--stone-2)" }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(4, Math.min(100, pct))}%`, background: colors[tone] }} />
    </div>
  );
}

export function StatCard({ icon, label, value, tone = "gold" }: { icon: ReactNode; label: string; value: string | number; tone?: Tone }) {
  const bg: Record<Tone, string> = { gold: "var(--amber-soft)", green: "var(--green-soft)", coral: "var(--coral-soft)", blue: "var(--primary-soft)", warning: "var(--warning-soft)" };
  const fg: Record<Tone, string> = { gold: "var(--gold-deep)", green: "var(--green)", coral: "var(--coral)", blue: "var(--primary-deep)", warning: "var(--warning)" };
  return (
    <div className="brick bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: "var(--slate)" }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: bg[tone], color: fg[tone] }}>{icon}</div>
      <div className="disp text-2xl font-bold">{value}</div>
      <div className="text-xs text-[--ink-soft]">{label}</div>
    </div>
  );
}

export function TopicChip({ label, pct }: { label: string; pct: number }) {
  const tone = pct >= 70 ? "green" : pct >= 50 ? "gold" : "coral";
  const dot = { green: "🟢", gold: "🟡", coral: "🔴" }[tone];
  return (
    <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border" style={{ borderColor: "var(--slate)" }}>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-sm font-semibold flex items-center gap-1">{dot} {pct}%</span>
    </div>
  );
}
