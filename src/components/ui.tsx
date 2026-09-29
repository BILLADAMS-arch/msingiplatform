"use client";
import { ReactNode, ComponentProps, CSSProperties } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, ChevronRight } from "lucide-react";

export type Tone = "gold" | "green" | "coral" | "blue" | "warning";

export function Pill({ children, tone = "gold" }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    gold: "bg-(--amber-soft) text-(--gold-deep)",
    green: "bg-(--green-soft) text-(--green)",
    coral: "bg-(--coral-soft) text-(--coral)",
    blue: "bg-(--primary-soft) text-(--primary-deep)",
    warning: "bg-(--warning-soft) text-(--warning)",
  };
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function FoundationBar({ pct, tone = "blue", height = 10, label }: { pct: number; tone?: Tone; height?: number; label?: string }) {
  const colors: Record<Tone, string> = { gold: "var(--gold)", green: "var(--green)", coral: "var(--coral)", blue: "var(--primary)", warning: "var(--warning)" };
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: "var(--stone-2)" }}
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.max(0, Math.min(100, pct)))} aria-label={label}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct <= 0 ? 0 : Math.max(4, Math.min(100, pct))}%`, background: colors[tone] }} />
    </div>
  );
}

export function StatCard({ icon, label, value, tone = "gold", hint }: { icon: ReactNode; label: string; value: string | number; tone?: Tone; hint?: ReactNode }) {
  const bg: Record<Tone, string> = { gold: "var(--amber-soft)", green: "var(--green-soft)", coral: "var(--coral-soft)", blue: "var(--primary-soft)", warning: "var(--warning-soft)" };
  const fg: Record<Tone, string> = { gold: "var(--gold-deep)", green: "var(--green)", coral: "var(--coral)", blue: "var(--primary-deep)", warning: "var(--warning)" };
  return (
    <div className="brick bg-white rounded-2xl p-4 shadow-sm border" style={{ borderColor: "var(--slate)" }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: bg[tone], color: fg[tone] }}>{icon}</div>
      <div className="disp text-2xl font-bold">{value}</div>
      <div className="text-xs text-(--ink-soft)">{label}</div>
      {hint && <div className="text-[11px] text-(--muted) mt-0.5">{hint}</div>}
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

/* ---------------------------------------------------------------------- */
/* Design-system primitives                                                 */
/* ---------------------------------------------------------------------- */

const TONE_FG: Record<Tone, string> = { gold: "var(--gold-deep)", green: "var(--green)", coral: "var(--coral)", blue: "var(--primary)", warning: "var(--warning)" };

type ButtonVariant = "primary" | "secondary" | "ghost" | "gold" | "success" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "text-white bg-(--primary) hover:bg-(--primary-deep)",
  secondary: "bg-white text-(--ink) border border-(--slate) hover:border-(--primary) hover:text-(--primary-deep)",
  ghost: "text-(--primary-deep) hover:bg-(--primary-soft)",
  gold: "text-white bg-(--gold-deep) hover:brightness-95",
  success: "text-white bg-(--green) hover:brightness-95",
  danger: "text-(--coral) bg-(--coral-soft) hover:brightness-95",
};
const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3.5 text-xs gap-1.5",
  md: "min-h-11 px-5 text-sm gap-2",
  lg: "min-h-12 px-6 text-base gap-2",
};

type ButtonOwnProps = { variant?: ButtonVariant; size?: ButtonSize; full?: boolean; className?: string; children: ReactNode };

function buttonClass({ variant = "primary", size = "md", full, className = "" }: Omit<ButtonOwnProps, "children">) {
  return `tap inline-flex items-center justify-center rounded-full font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${full ? "w-full" : ""} ${className}`;
}

/** The one button. Pass `href` to render a Next.js Link with button styling. */
export function Button(props: ButtonOwnProps & (({ href: string } & Omit<ComponentProps<typeof Link>, "href" | "className">) | ({ href?: undefined } & Omit<ComponentProps<"button">, "className">))) {
  const { variant, size, full, className, children, ...rest } = props;
  const cls = buttonClass({ variant, size, full, className });
  if (rest.href !== undefined) {
    const { href, ...linkRest } = rest as { href: string } & Omit<ComponentProps<typeof Link>, "href" | "className">;
    return <Link href={href} className={cls} {...linkRest}>{children}</Link>;
  }
  const { type = "button", ...buttonRest } = rest as Omit<ComponentProps<"button">, "className">;
  return <button type={type} className={cls} {...buttonRest}>{children}</button>;
}

/** Surface for grouped content. `interactive` adds the subtle hover lift. */
export function Card({ children, className = "", padding = "md", interactive = false, style, as: Tag = "div" }: {
  children: ReactNode; className?: string; padding?: "none" | "sm" | "md" | "lg"; interactive?: boolean; style?: CSSProperties; as?: "div" | "section" | "article" | "li";
}) {
  const pad = { none: "", sm: "p-4", md: "p-5", lg: "p-6 sm:p-7" }[padding];
  return (
    <Tag className={`${interactive ? "brick" : ""} bg-white rounded-2xl border border-(--slate) ${pad} ${className}`} style={{ boxShadow: "var(--shadow-card)", ...style }}>
      {children}
    </Tag>
  );
}

/** A titled block of a page: heading + optional description and action on the right. */
export function Section({ title, description, action, children, className = "", id, size = "md", eyebrow }: {
  title: ReactNode; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string;
  /** "lg" is for marketing pages: larger heading, more breathing room. */
  size?: "md" | "lg"; eyebrow?: ReactNode;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  const lg = size === "lg";
  return (
    <section id={id} aria-labelledby={headingId} className={className}>
      <div className={`flex items-end justify-between gap-3 ${lg ? "mb-8 sm:mb-10" : "mb-3"}`}>
        <div className={`min-w-0 ${lg ? "max-w-2xl" : ""}`}>
          {eyebrow && <div className="text-xs font-bold uppercase tracking-wider text-(--primary-deep) mb-2">{eyebrow}</div>}
          <h2 id={headingId} className={`disp font-bold leading-tight ${lg ? "text-3xl sm:text-4xl tracking-tight" : "text-lg"}`}>{title}</h2>
          {description && <p className={`text-(--ink-soft) ${lg ? "text-base sm:text-lg mt-3" : "text-sm mt-0.5"}`}>{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/** Explains what's missing and what the learner can do about it. */
export function EmptyState({ icon, title, description, action, compact = false }: {
  icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; compact?: boolean;
}) {
  return (
    <div className={`text-center mx-auto max-w-sm ${compact ? "py-6" : "py-12"}`}>
      {icon && <div className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center bg-(--primary-soft) text-(--primary-deep)" aria-hidden>{icon}</div>}
      <h3 className="disp font-bold text-base">{title}</h3>
      {description && <p className="text-sm text-(--ink-soft) mt-1">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** A shimmering placeholder block. Size it with className (e.g. "h-4 w-32"). */
export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden className={`skeleton rounded-xl ${className}`} style={style} />;
}

/** Wraps skeletons so screen readers hear one "Loading…" instead of nothing. */
export function LoadingState({ label = "Loading…", children }: { label?: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Human-readable failure with an optional retry. */
export function ErrorState({ title = "Something went wrong", message = "We couldn't load this right now. Check your connection and try again.", onRetry, compact = false }: {
  title?: string; message?: ReactNode; onRetry?: () => void; compact?: boolean;
}) {
  return (
    <div role="alert" className={`text-center mx-auto max-w-sm ${compact ? "py-6" : "py-12"}`}>
      <div className="w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center bg-(--coral-soft) text-(--coral)" aria-hidden><AlertTriangle size={22} /></div>
      <h3 className="disp font-bold text-base">{title}</h3>
      <p className="text-sm text-(--ink-soft) mt-1">{message}</p>
      {onRetry && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" size="sm" onClick={onRetry}><RotateCw size={14} /> Try again</Button>
        </div>
      )}
    </div>
  );
}

/** Circular progress (0–100). Put the headline value in `children`. */
export function ProgressRing({ pct, size = 132, stroke = 10, tone = "blue", label, children }: {
  pct: number; size?: number; stroke?: number; tone?: Tone; label?: string; children?: ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped)} aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--stone-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TONE_FG[tone]} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 700ms ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/**
 * Curriculum trail. Items marked `mobile: false` are hidden on small screens
 * so the trail stays on one or two lines; the last item is the current page.
 */
export function Breadcrumbs({ items }: { items: { label: string; href?: string; mobile?: boolean }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-(--ink-soft)">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className={`${item.mobile === false ? "hidden sm:flex" : "flex"} items-center gap-1.5 min-w-0`}>
              {item.href && !last ? (
                <Link href={item.href} className="hover:text-(--primary-deep) underline-offset-2 hover:underline py-1">{item.label}</Link>
              ) : (
                <span className={last ? "text-(--ink) font-semibold" : ""} aria-current={last ? "page" : undefined}>{item.label}</span>
              )}
              {!last && <ChevronRight size={12} className="text-(--muted) shrink-0" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
