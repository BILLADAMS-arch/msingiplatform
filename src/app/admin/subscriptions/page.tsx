"use client";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Pill } from "@/components/ui";

type Row = { userId: string; email: string; name: string | null; plan: "FREE" | "PREMIUM"; status: string; currentPeriodEnd: string | null };

export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = () => fetch("/api/admin/subscriptions").then((r) => r.json()).then((d) => setRows(d.subscriptions));
  useEffect(() => { load(); }, []);

  async function setPlan(userId: string, action: "grant" | "revoke") {
    setSaving(userId);
    await fetch("/api/admin/subscriptions", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, action }),
    });
    await load();
    setSaving(null);
  }

  const premiumCount = rows?.filter((r) => r.plan === "PREMIUM").length ?? 0;

  return (
    <AdminShell title="Subscriptions">
      <p className="text-sm text-[--ink-soft] mb-4">
        {rows ? `${premiumCount} of ${rows.length} learners on Msingi Premium.` : "Loading…"} Learners pay via M-Pesa from{" "}
        <span className="font-medium">/upgrade</span> — use the actions below for offline/school payments.
      </p>

      {!rows ? <p className="text-sm text-[--ink-soft]">Loading…</p> : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "var(--slate)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[--ink-soft] border-b" style={{ borderColor: "var(--slate)" }}>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Renews / ends</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-b last:border-0" style={{ borderColor: "var(--stone-2)" }}>
                  <td className="px-4 py-3 font-medium">{r.name ?? "—"}</td>
                  <td className="px-4 py-3 text-[--ink-soft]">{r.email}</td>
                  <td className="px-4 py-3"><Pill tone={r.plan === "PREMIUM" ? "gold" : "green"}>{r.plan}</Pill></td>
                  <td className="px-4 py-3 text-[--ink-soft]">{r.currentPeriodEnd ? new Date(r.currentPeriodEnd).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <button disabled={saving === r.userId} onClick={() => setPlan(r.userId, r.plan === "PREMIUM" ? "revoke" : "grant")}
                      className="tap text-xs font-semibold disabled:opacity-40" style={{ color: r.plan === "PREMIUM" ? "var(--coral)" : "var(--primary)" }}>
                      {r.plan === "PREMIUM" ? "Revoke Premium" : "Grant Premium"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="text-sm text-[--ink-soft] px-4 py-6">No learner accounts yet.</p>}
        </div>
      )}
    </AdminShell>
  );
}
