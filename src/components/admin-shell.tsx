"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, Users, GitBranch, BookOpen, HelpCircle, ClipboardCheck, Library, FlaskConical, BarChart3 } from "lucide-react";

const NAV = [
  { href: "/admin", icon: <LayoutDashboard size={16} />, label: "Dashboard" },
  { href: "/admin/users", icon: <Users size={16} />, label: "Users" },
  { href: "/admin/curriculum", icon: <GitBranch size={16} />, label: "Curriculum" },
  { href: "/admin/lessons", icon: <BookOpen size={16} />, label: "Lessons" },
  { href: "/admin/questions", icon: <HelpCircle size={16} />, label: "Questions" },
  { href: "/admin/tests", icon: <ClipboardCheck size={16} />, label: "Tests" },
  { href: "/admin/resources", icon: <Library size={16} />, label: "Resources" },
  { href: "/admin/playground", icon: <FlaskConical size={16} />, label: "Playground" },
  { href: "/admin/analytics", icon: <BarChart3 size={16} />, label: "Analytics" },
];

export function AdminShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="msingi min-h-screen flex">
      <div className="hidden md:flex flex-col w-56 shrink-0 border-r min-h-screen" style={{ borderColor: "var(--slate)" }}>
        <Link href="/admin" className="flex items-center gap-2 px-5 py-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center disp font-bold text-white text-sm" style={{ background: "var(--ink)" }}>M</div>
          <span className="disp font-bold">Admin</span>
        </Link>
        <div className="flex-1 flex flex-col gap-0.5 px-3">
          {NAV.map((n) => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href}
                className={`tap flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium ${active ? "text-white" : "text-[--ink-soft]"}`}
                style={{ background: active ? "var(--ink)" : "transparent" }}>
                {n.icon}{n.label}
              </Link>
            );
          })}
        </div>
        <button onClick={() => { createClient().auth.signOut().then(() => router.push("/")); }} className="tap m-3 px-3 py-2 rounded-xl text-sm font-medium text-[--ink-soft] text-left">
          Sign out
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="sticky top-0 z-20 backdrop-blur border-b md:hidden" style={{ background: "rgba(246,243,236,0.9)", borderColor: "var(--slate)" }}>
          <div className="px-5 py-3 flex items-center gap-2 overflow-x-auto">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="tap whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border" style={{ borderColor: "var(--slate)" }}>
                {n.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-8">
          {title && <h1 className="disp text-2xl font-bold mb-6">{title}</h1>}
          {children}
        </div>
      </div>
    </div>
  );
}
