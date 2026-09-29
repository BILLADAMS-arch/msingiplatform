// Presentation helpers for the app's EXISTING mastery values — these don't
// change how mastery is calculated, only how it's labelled.

/** Roadmap "mastered" checkmark threshold, also the top of the Improving band. */
export const MASTERED = 70;

export type Band = { label: "Needs practice" | "Improving" | "Strong"; tone: "coral" | "gold" | "green" };

/** Same bands the app already used in TopicChip: <50 / 50–69 / ≥70. */
export function bandFor(pct: number): Band {
  if (pct >= MASTERED) return { label: "Strong", tone: "green" };
  if (pct >= 50) return { label: "Improving", tone: "gold" };
  return { label: "Needs practice", tone: "coral" };
}

function utcDay(d: Date) { return d.toISOString().slice(0, 10); }

/**
 * profiles.streak is only recalculated when the learner is next active, so a
 * lapsed streak is still stored. Show it only while it's still alive (active
 * today or yesterday, UTC — the same rule gamification.touchStreak uses).
 */
export function liveStreak(streak: number, lastActiveAt: string | null): { days: number; activeToday: boolean } {
  if (!lastActiveAt) return { days: 0, activeToday: false };
  const today = utcDay(new Date());
  const last = utcDay(new Date(lastActiveAt));
  const gap = Math.round((Date.parse(today) - Date.parse(last)) / 86_400_000);
  return gap <= 1 ? { days: streak, activeToday: gap === 0 } : { days: 0, activeToday: false };
}
