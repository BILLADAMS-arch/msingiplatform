// Subtle per-subject accent colours (spec: icons, small accents, progress
// indicators, subject cards — never whole-page theming). Matched by keyword
// since subjects are admin-authored, not a fixed enum.
const SUBJECT_ACCENTS: { match: RegExp; color: string; soft: string }[] = [
  { match: /math/i, color: "#155EEF", soft: "#E7EFFE" },
  { match: /(science|integrated)/i, color: "#16A34A", soft: "#E7F7ED" },
  { match: /english/i, color: "#7C3AED", soft: "#F1E9FE" },
  { match: /kiswahili/i, color: "#F97316", soft: "#FFF1E7" },
  { match: /social/i, color: "#0D9488", soft: "#E3F6F4" },
  { match: /computer/i, color: "#4F46E5", soft: "#EAE9FD" },
];

const DEFAULT_ACCENT = { color: "var(--primary)", soft: "var(--primary-soft)" };

export function subjectAccent(subjectName: string | null | undefined): { color: string; soft: string } {
  if (!subjectName) return DEFAULT_ACCENT;
  const hit = SUBJECT_ACCENTS.find((s) => s.match.test(subjectName));
  return hit ? { color: hit.color, soft: hit.soft } : DEFAULT_ACCENT;
}
