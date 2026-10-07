// Learner levels. This is the app's EXISTING rule (one level per 500 XP, six
// levels), moved here so the dashboard, progress and profile pages agree.
// Nothing about how XP is earned or stored changes.
export const LEVELS = ["Beginner", "Explorer", "Learner", "Scholar", "Expert", "Master"] as const;
export const XP_PER_LEVEL = 500;

export function levelForXP(xp: number): string {
  return LEVELS[Math.min(LEVELS.length - 1, Math.floor(xp / XP_PER_LEVEL))];
}

export type LevelProgress = {
  number: number;          // 1-based
  name: string;
  nextName: string | null; // null at the top level
  xp: number;
  xpIntoLevel: number;
  xpToNext: number;        // 0 at the top level
  pct: number;             // progress through the current level, 0–100
  isMax: boolean;
};

export function levelProgress(xp: number): LevelProgress {
  const safe = Math.max(0, xp);
  const index = Math.min(LEVELS.length - 1, Math.floor(safe / XP_PER_LEVEL));
  const isMax = index === LEVELS.length - 1;
  const xpIntoLevel = isMax ? XP_PER_LEVEL : safe - index * XP_PER_LEVEL;
  return {
    number: index + 1,
    name: LEVELS[index],
    nextName: isMax ? null : LEVELS[index + 1],
    xp: safe,
    xpIntoLevel,
    xpToNext: isMax ? 0 : (index + 1) * XP_PER_LEVEL - safe,
    pct: isMax ? 100 : Math.round((xpIntoLevel / XP_PER_LEVEL) * 100),
    isMax,
  };
}
