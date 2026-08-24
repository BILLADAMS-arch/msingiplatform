"use client";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";

type Role = "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";
type User = { id: string; email: string; role: Role; createdAt: string; name: string | null; gradeName: string | null };

const ROLES: Role[] = ["STUDENT", "TEACHER", "PARENT", "ADMIN"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [filter, setFilter] = useState<Role | "">("");
  const [saving, setSaving] = useState<string | null>(null);

  const load = () => fetch("/api/admin/users").then((r) => r.json()).then((d) => setUsers(d.users));
  useEffect(() => { load(); }, []);

  async function changeRole(user: User, role: Role) {
    setSaving(user.id);
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }),
    });
    setUsers((us) => us?.map((u) => (u.id === user.id ? { ...u, role } : u)) ?? null);
    setSaving(null);
  }

  const shown = users?.filter((u) => !filter || u.role === filter);

  return (
    <AdminShell title="Users">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilter("")} className={`tap px-3 py-1.5 rounded-full text-xs font-semibold border ${!filter ? "text-white" : ""}`} style={{ borderColor: "var(--ink)", background: !filter ? "var(--ink)" : "white" }}>All</button>
        {ROLES.map((r) => (
          <button key={r} onClick={() => setFilter(r)} className={`tap px-3 py-1.5 rounded-full text-xs font-semibold border ${filter === r ? "text-white" : ""}`} style={{ borderColor: "var(--ink)", background: filter === r ? "var(--ink)" : "white" }}>{r}</button>
        ))}
      </div>

      {!shown ? <p className="text-sm text-[--ink-soft]">Loading…</p> : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "var(--slate)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[--ink-soft] border-b" style={{ borderColor: "var(--slate)" }}>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Grade</th>
                <th className="px-4 py-3 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u.id} className="border-b last:border-0" style={{ borderColor: "var(--stone-2)" }}>
                  <td className="px-4 py-3 font-medium">{u.name ?? "—"}</td>
                  <td className="px-4 py-3 text-[--ink-soft]">{u.email}</td>
                  <td className="px-4 py-3 text-[--ink-soft]">{u.gradeName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <select disabled={saving === u.id} value={u.role} onChange={(e) => changeRole(u, e.target.value as Role)}
                      className="border rounded-lg px-2 py-1 text-xs font-semibold disabled:opacity-50" style={{ borderColor: "var(--slate)" }}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <p className="text-sm text-[--ink-soft] px-4 py-6">No users match this filter.</p>}
        </div>
      )}
    </AdminShell>
  );
}
