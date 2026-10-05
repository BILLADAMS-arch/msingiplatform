"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Home, BookOpen, Dumbbell, LineChart, FlaskConical, Library, Sparkles, User, Flame, Star, Search, Users, Crown,
  ClipboardCheck, BookMarked, Trophy, Medal, LogOut, MoreHorizontal, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { subjectAccent } from "@/lib/subject-colors";
import { getProfile, getSubjects, clearClientData } from "@/lib/client-data";
import { Pill } from "./ui";
import { NotificationBell } from "./notification-bell";

type NavItem = { href: string; icon: React.ReactNode; label: string };

// Every href below is an existing route — the nav is a new arrangement of
// what's already there, not new pages.
const STUDENT_PRIMARY: NavItem[] = [
  { href: "/dashboard", icon: <Home size={18} />, label: "Home" },
  { href: "/learn", icon: <BookOpen size={18} />, label: "Learn" },
  { href: "/practice", icon: <Dumbbell size={18} />, label: "Practice" },
  { href: "/tests", icon: <ClipboardCheck size={18} />, label: "Tests" },
  { href: "/progress", icon: <LineChart size={18} />, label: "Progress" },
  { href: "/ai", icon: <Sparkles size={18} />, label: "Ask Msingi" },
];

const STUDENT_SECONDARY: NavItem[] = [
  { href: "/mistakes", icon: <BookMarked size={18} />, label: "My Mistakes" },
  { href: "/library", icon: <Library size={18} />, label: "Library" },
  { href: "/playground", icon: <FlaskConical size={18} />, label: "Playground" },
  { href: "/leaderboard", icon: <Medal size={18} />, label: "Leaderboard" },
  { href: "/progress#achievements", icon: <Trophy size={18} />, label: "Achievements" },
  { href: "/profile", icon: <User size={18} />, label: "Profile" },
];

// Mobile tab bar keeps the four most-used destinations; everything else
// lives behind "More" so nothing is lost on small screens.
const STUDENT_TABS = ["/dashboard", "/learn", "/practice", "/progress"];

// Teacher/Parent have only a couple of pages so far — deliberately not the
// student nav (those links are STUDENT-only routes that would redirect away).
const TEACHER_NAV: NavItem[] = [
  { href: "/teacher", icon: <Home size={18} />, label: "Dashboard" },
  { href: "/profile", icon: <User size={18} />, label: "Profile" },
];
const PARENT_NAV: NavItem[] = [
  { href: "/parent", icon: <Users size={18} />, label: "Dashboard" },
  { href: "/profile", icon: <User size={18} />, label: "Profile" },
];

type Variant = "student" | "teacher" | "parent";

const NAV_BY_VARIANT: Record<Variant, { primary: NavItem[]; secondary: NavItem[]; home: string }> = {
  student: { primary: STUDENT_PRIMARY, secondary: STUDENT_SECONDARY, home: "/dashboard" },
  teacher: { primary: TEACHER_NAV, secondary: [], home: "/teacher" },
  parent: { primary: PARENT_NAV, secondary: [], home: "/parent" },
};

function isActive(pathname: string, href: string) {
  const path = href.split("#")[0];
  if (href.includes("#")) return false; // anchor shortcuts never own the active state
  return pathname === path || pathname.startsWith(path + "/");
}

/* ---------------------------------------------------------------------- */
/* My Subjects — real subjects for the learner's grade                      */
/* ---------------------------------------------------------------------- */

type Subject = { id: string; name: string };
// Each page renders its own <Shell>, so cache for the tab's lifetime rather
// than refetching the learner's subjects on every navigation.
let subjectsCache: Promise<Subject[]> | null = null;
function loadSubjects(): Promise<Subject[]> {
  // getProfile/getSubjects share one request with the page that's rendering.
  subjectsCache ??= getProfile()
    .then(async (p) => (p?.gradeId ? ((await getSubjects(p.gradeId)).subjects ?? []) : []))
    .catch(() => {
      subjectsCache = null;
      return [];
    });
  return subjectsCache;
}

function SubjectLinks({ onNavigate }: { onNavigate?: () => void }) {
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const pathname = usePathname();
  const params = useSearchParams();
  useEffect(() => { loadSubjects().then(setSubjects); }, []);

  if (!subjects || subjects.length === 0) return null;
  const onLearn = pathname === "/learn";
  const activeId = onLearn ? params.get("subjectId") : null;
  const activeName = onLearn && !activeId ? params.get("subject") : null; // legacy ?subject=<name> links
  return (
    <div>
      <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-(--muted)">My Subjects</div>
      <ul className="space-y-0.5">
        {subjects.map((s) => {
          const active = activeId ? activeId === s.id : activeName === s.name;
          return (
            <li key={s.id}>
              <Link href={`/learn?subjectId=${s.id}`} onClick={onNavigate} aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-3 min-h-10 rounded-xl text-sm font-medium transition-colors ${active ? "bg-(--primary-soft) text-(--primary-deep)" : "text-(--ink-soft) hover:bg-(--stone-2) hover:text-(--ink)"}`}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: subjectAccent(s.name).color }} aria-hidden />
                <span className="truncate">{s.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Pieces                                                                   */
/* ---------------------------------------------------------------------- */

function NavLinks({ items, pathname, onNavigate }: { items: NavItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {items.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <li key={n.href}>
            <Link href={n.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-3 min-h-11 rounded-xl text-sm font-semibold transition-colors ${active ? "bg-(--primary-soft) text-(--primary-deep)" : "text-(--ink-soft) hover:bg-(--stone-2) hover:text-(--ink)"}`}>
              <span className={active ? "text-(--primary)" : ""} aria-hidden>{n.icon}</span>
              {n.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Divider() {
  return <div className="my-3 mx-3 border-t border-(--slate)" />;
}

function useSignOut() {
  const router = useRouter();
  return async () => {
    await createClient().auth.signOut();
    subjectsCache = null;
    clearClientData();
    router.push("/");
  };
}

function Logo({ home, withWordmark = true }: { home: string; withWordmark?: boolean }) {
  return (
    <Link href={home} className="flex items-center gap-2.5 rounded-xl" aria-label="Msingi home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-icon.png" alt="" className="w-11 h-11 object-contain" />
      {withWordmark && (
        <span className="leading-tight">
          <span className="disp block text-lg">Msingi</span>
          <span className="block text-[11px] font-semibold text-(--ink-soft)">Learn. Practise. Grow.</span>
        </span>
      )}
    </Link>
  );
}

/* ---------------------------------------------------------------------- */
/* Mobile "More" sheet                                                      */
/* ---------------------------------------------------------------------- */

function MoreSheet({ open, onClose, items, pathname, showSubjects, onSignOut }: {
  open: boolean; onClose: () => void; items: NavItem[]; pathname: string; showSubjects: boolean; onSignOut: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>("a,button");
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-40">
      <div className="absolute inset-0 bg-[rgba(11,31,68,0.35)] fade-in" onClick={onClose} aria-hidden />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="More navigation"
        className="fade-in absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-white rounded-t-3xl px-3 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        style={{ boxShadow: "var(--shadow-raised)" }}>
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="disp text-base">More</span>
          <button type="button" onClick={onClose} aria-label="Close menu" className="tap w-10 h-10 rounded-full flex items-center justify-center hover:bg-(--stone-2)">
            <X size={18} />
          </button>
        </div>
        <nav aria-label="More">
          <NavLinks items={items} pathname={pathname} onNavigate={onClose} />
          {showSubjects && (
            <>
              <Divider />
              <Suspense><SubjectLinks onNavigate={onClose} /></Suspense>
            </>
          )}
        </nav>
        <Divider />
        <button type="button" onClick={onSignOut} className="w-full flex items-center gap-3 px-3 min-h-11 rounded-xl text-sm font-semibold text-(--coral) hover:bg-(--coral-soft)">
          <LogOut size={18} aria-hidden /> Sign out
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Shell                                                                    */
/* ---------------------------------------------------------------------- */

export function Shell({ children, name, xp, streak, variant = "student" }: { children: React.ReactNode; name?: string; xp?: number; streak?: number; variant?: Variant }) {
  const pathname = usePathname();
  const signOut = useSignOut();
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = useCallback(() => setMoreOpen(false), []);
  const { primary, secondary, home } = NAV_BY_VARIANT[variant];
  const isStudent = variant === "student";

  const tabs = isStudent ? primary.filter((n) => STUDENT_TABS.includes(n.href)) : primary;
  const moreItems = isStudent ? [...primary.filter((n) => !STUDENT_TABS.includes(n.href)), ...secondary] : [];
  const moreActive = moreItems.some((n) => isActive(pathname, n.href));

  return (
    <div className="msingi min-h-screen pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-full focus:bg-white focus:shadow">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col bg-white border-r border-(--slate)">
        <div className="px-5 pt-5 pb-4"><Logo home={home} /></div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-3">
          <NavLinks items={primary} pathname={pathname} />
          {isStudent && (
            <Suspense>
              <div className="mt-3 pt-3 border-t border-(--slate)"><SubjectLinks /></div>
            </Suspense>
          )}
          {secondary.length > 0 && (
            <>
              <Divider />
              <NavLinks items={secondary} pathname={pathname} />
            </>
          )}
        </nav>
        <div className="p-3 border-t border-(--slate)">
          <button type="button" onClick={signOut} className="w-full flex items-center gap-3 px-3 min-h-11 rounded-xl text-sm font-semibold text-(--ink-soft) hover:bg-(--coral-soft) hover:text-(--coral)">
            <LogOut size={18} aria-hidden /> Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 backdrop-blur border-b border-(--slate)" style={{ background: "rgba(247,250,255,0.85)" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            <div className="lg:hidden"><Logo home={home} withWordmark={false} /></div>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2 sm:gap-2.5">
              {typeof streak === "number" && <span title="Learning streak (days)"><Pill tone="gold"><Flame size={12} aria-hidden /> {streak}<span className="sr-only"> day streak</span></Pill></span>}
              {typeof xp === "number" && <span className="hidden sm:inline-flex" title="Experience points"><Pill tone="gold"><Star size={12} aria-hidden /> {xp} XP</Pill></span>}
              {variant !== "teacher" && (
                <Link href="/upgrade" className="tap hidden sm:flex items-center gap-1 px-3 min-h-9 rounded-full text-xs font-semibold text-white bg-(--gold-deep)">
                  <Crown size={12} aria-hidden /> Upgrade
                </Link>
              )}
              <Link href="/search" aria-label="Search" className="tap w-9 h-9 rounded-full flex items-center justify-center border border-(--slate) bg-white hover:border-(--primary)">
                <Search size={16} aria-hidden />
              </Link>
              <NotificationBell />
              <Link href="/profile" aria-label="Your profile" className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white bg-(--green)">
                {name?.[0]?.toUpperCase() || <User size={16} aria-hidden />}
              </Link>
            </div>
          </div>
        </header>

        <main id="main" className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
      </div>

      {/* Mobile / tablet tab bar */}
      <nav aria-label="Main" className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-(--slate) pb-[env(safe-area-inset-bottom)]">
        <ul className="flex justify-around max-w-xl mx-auto">
          {tabs.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <li key={n.href} className="flex-1">
                <Link href={n.href} aria-current={active ? "page" : undefined}
                  className={`tap flex flex-col items-center justify-center gap-0.5 min-h-14 text-[11px] font-semibold ${active ? "text-(--primary)" : "text-(--ink-soft)"}`}>
                  <span aria-hidden>{n.icon}</span>{n.label}
                </Link>
              </li>
            );
          })}
          {isStudent && (
            <li className="flex-1">
              <button type="button" onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-expanded={moreOpen}
                className={`tap w-full flex flex-col items-center justify-center gap-0.5 min-h-14 text-[11px] font-semibold ${moreActive ? "text-(--primary)" : "text-(--ink-soft)"}`}>
                <MoreHorizontal size={18} aria-hidden />More
              </button>
            </li>
          )}
        </ul>
      </nav>

      {isStudent && (
        <MoreSheet open={moreOpen} onClose={closeMore} items={moreItems} pathname={pathname} showSubjects onSignOut={signOut} />
      )}
    </div>
  );
}
