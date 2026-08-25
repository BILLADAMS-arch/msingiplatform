"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Dumbbell, LineChart, FlaskConical, Library, Sparkles, User, Flame, Star, Search, Users } from "lucide-react";
import { Pill } from "./ui";
import { NotificationBell } from "./notification-bell";

const STUDENT_MOBILE_NAV = [
  { href: "/dashboard", icon: <Home size={18} />, label: "Home" },
  { href: "/learn", icon: <BookOpen size={18} />, label: "Learn" },
  { href: "/practice", icon: <Dumbbell size={18} />, label: "Practice" },
  { href: "/playground", icon: <FlaskConical size={18} />, label: "Playground" },
  { href: "/profile", icon: <User size={18} />, label: "Profile" },
];

const STUDENT_DESKTOP_NAV = [
  ...STUDENT_MOBILE_NAV.slice(0, 3),
  { href: "/library", icon: <Library size={18} />, label: "Library" },
  { href: "/ai", icon: <Sparkles size={18} />, label: "Msingi AI" },
  { href: "/progress", icon: <LineChart size={18} />, label: "Progress" },
  { href: "/leaderboard", icon: <Star size={18} />, label: "Leaderboard" },
];

// Teacher/Parent have only a couple of pages so far — same short nav on
// mobile and desktop, and deliberately not the student nav (those links are
// STUDENT-only routes that would just redirect a teacher/parent away).
const TEACHER_NAV = [
  { href: "/teacher", icon: <Home size={18} />, label: "Dashboard" },
  { href: "/profile", icon: <User size={18} />, label: "Profile" },
];
const PARENT_NAV = [
  { href: "/parent", icon: <Users size={18} />, label: "Dashboard" },
  { href: "/profile", icon: <User size={18} />, label: "Profile" },
];

type Variant = "student" | "teacher" | "parent";

const NAV_BY_VARIANT: Record<Variant, { mobile: typeof STUDENT_MOBILE_NAV; desktop: typeof STUDENT_MOBILE_NAV; home: string }> = {
  student: { mobile: STUDENT_MOBILE_NAV, desktop: STUDENT_DESKTOP_NAV, home: "/dashboard" },
  teacher: { mobile: TEACHER_NAV, desktop: TEACHER_NAV, home: "/teacher" },
  parent: { mobile: PARENT_NAV, desktop: PARENT_NAV, home: "/parent" },
};

export function Shell({ children, name, xp, streak, variant = "student" }: { children: React.ReactNode; name?: string; xp?: number; streak?: number; variant?: Variant }) {
  const pathname = usePathname();
  const { mobile, desktop, home } = NAV_BY_VARIANT[variant];
  return (
    <div className="msingi min-h-screen pb-20 md:pb-0">
      <div className="sticky top-0 z-20 backdrop-blur border-b" style={{ background: "rgba(247,250,255,0.85)", borderColor: "var(--slate)" }}>
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href={home} className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="Msingi" className="w-9 h-9 object-contain" />
            <span className="disp font-bold hidden sm:inline">Msingi</span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {desktop.map((n) => (
              <Link key={n.href} href={n.href} className={`tap flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium ${pathname.startsWith(n.href) ? "text-[--primary]" : "text-[--ink-soft]"}`}>
                {n.icon}{n.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {typeof streak === "number" && <Pill tone="gold"><Flame size={12} /> {streak}</Pill>}
            {typeof xp === "number" && <Pill tone="gold"><Star size={12} /> {xp} XP</Pill>}
            <Link href="/search" className="w-8 h-8 rounded-full flex items-center justify-center border" style={{ borderColor: "var(--slate)" }} title="Search">
              <Search size={16} />
            </Link>
            <NotificationBell />
            <Link href="/profile" className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "var(--green)" }} title="Profile">
              {name?.[0]?.toUpperCase() || "?"}
            </Link>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-5 py-6">{children}</div>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 z-20" style={{ borderColor: "var(--slate)" }}>
        {mobile.map((n) => (
          <Link key={n.href} href={n.href} className={`tap flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium ${pathname.startsWith(n.href) ? "text-[--primary]" : "text-[--ink-soft]"}`}>
            {n.icon}{n.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
