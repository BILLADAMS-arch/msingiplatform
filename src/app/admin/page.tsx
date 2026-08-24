"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { StatCard } from "@/components/ui";
import { Users, GraduationCap, UserCog, BookOpen, HelpCircle, ClipboardCheck, Library } from "lucide-react";

type Stats = {
  userCounts: { STUDENT: number; TEACHER: number; PARENT: number; ADMIN: number };
  contentCounts: { lessons: number; questions: number; tests: number; resources: number };
};

const SHORTCUTS = [
  { href: "/admin/curriculum", label: "Manage Curriculum", icon: <BookOpen size={18} /> },
  { href: "/admin/lessons/new", label: "Write a Lesson", icon: <BookOpen size={18} /> },
  { href: "/admin/questions/new", label: "Add a Question", icon: <HelpCircle size={18} /> },
  { href: "/admin/tests/new", label: "Build a Test", icon: <ClipboardCheck size={18} /> },
  { href: "/admin/resources", label: "Upload a Resource", icon: <Library size={18} /> },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => { fetch("/api/admin/stats").then((r) => r.json()).then(setStats); }, []);

  return (
    <AdminShell title="Admin Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard icon={<Users size={18} />} label="Students" value={stats?.userCounts.STUDENT ?? "—"} tone="green" />
        <StatCard icon={<GraduationCap size={18} />} label="Teachers" value={stats?.userCounts.TEACHER ?? "—"} tone="gold" />
        <StatCard icon={<UserCog size={18} />} label="Parents" value={stats?.userCounts.PARENT ?? "—"} tone="gold" />
        <StatCard icon={<Library size={18} />} label="Resources" value={stats?.contentCounts.resources ?? "—"} tone="coral" />
      </div>

      <h3 className="disp font-bold mb-3">Quick actions</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {SHORTCUTS.map((s) => (
          <Link key={s.href} href={s.href} className="tap flex items-center gap-3 bg-white rounded-2xl border p-4" style={{ borderColor: "var(--slate)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--amber-soft)", color: "var(--gold-deep)" }}>{s.icon}</div>
            <span className="font-medium text-sm">{s.label}</span>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
