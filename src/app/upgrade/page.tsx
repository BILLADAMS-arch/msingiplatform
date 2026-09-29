"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Shell } from "@/components/shell";
import { createClient } from "@/lib/supabase/client";
import { Crown, Sparkles, Library, LineChart, Check, Loader2 } from "lucide-react";

type Status = { plan: "FREE" | "PREMIUM"; currentPeriodEnd: string | null; priceKes: number; ai: { usedToday: number; dailyLimit: number; unlimited: boolean } };
type Child = { id: string; name: string | null; gradeName: string | null };

const FEATURES = [
  { icon: <Sparkles size={18} />, label: "Unlimited Ask Msingi tutoring", sub: "No daily message limit" },
  { icon: <Library size={18} />, label: "Full Library access", sub: "Every premium worksheet, past paper and summary" },
  { icon: <LineChart size={18} />, label: "Deeper progress insights", sub: "Full mastery breakdowns and trends" },
];

function UpgradeInner() {
  const params = useSearchParams();
  const [role, setRole] = useState<"STUDENT" | "PARENT" | null>(null);
  const [children, setChildren] = useState<Child[] | null>(null);
  const [studentId, setStudentId] = useState<string | null>(params.get("studentId"));
  const [status, setStatus] = useState<Status | null>(null);
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<"idle" | "pending" | "demo-pending">("idle");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setRole((user?.app_metadata?.role as "STUDENT" | "PARENT" | undefined) ?? null);
    });
  }, []);

  useEffect(() => {
    if (role !== "PARENT") return;
    fetch("/api/parent/children").then((r) => r.json()).then((d) => {
      setChildren(d.children);
      if (!studentId && d.children?.[0]) setStudentId(d.children[0].id);
    });
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStatus = () => {
    if (role === "PARENT" && !studentId) return;
    const qs = studentId ? `?studentId=${studentId}` : "";
    fetch(`/api/billing/status${qs}`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return;
      setStatus(d);
      if (d.plan === "PREMIUM") setStage("idle");
    });
  };
  useEffect(loadStatus, [role, studentId]);

  useEffect(() => {
    if (stage !== "pending") return;
    const t = setInterval(loadStatus, 3000);
    return () => clearInterval(t);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  async function startCheckout() {
    if (!phone.trim()) return;
    setError(null);
    const res = await fetch("/api/billing/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.trim(), ...(studentId ? { studentId } : {}) }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) { setError(body?.error ?? "Could not start checkout."); return; }
    setPaymentId(body.paymentId);
    setStage(body.demo ? "demo-pending" : "pending");
  }

  async function confirmDemo() {
    if (!paymentId) return;
    await fetch("/api/billing/demo-confirm", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId }),
    });
    loadStatus();
  }

  const isPremium = status?.plan === "PREMIUM";

  return (
    <Shell>
      <div className="fade-in max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <Crown size={36} className="mx-auto text-(--gold-deep) mb-2" />
          <h1 className="disp text-3xl font-bold">Msingi Premium</h1>
          <p className="text-sm text-(--ink-soft) mt-1">Unlock everything Msingi has to offer.</p>
        </div>

        {role === "PARENT" && (
          <div className="brick bg-white rounded-2xl p-4 border" style={{ borderColor: "var(--slate)" }}>
            <label className="text-xs font-semibold text-(--ink-soft) block mb-1">Upgrade for</label>
            {!children ? <p className="text-sm text-(--ink-soft)">Loading your children…</p> : children.length === 0 ? (
              <p className="text-sm text-(--ink-soft)">Link a child from your Parent dashboard first.</p>
            ) : (
              <select value={studentId ?? ""} onChange={(e) => setStudentId(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }}>
                {children.map((c) => <option key={c.id} value={c.id}>{c.name ?? "Unnamed learner"} {c.gradeName ? `— ${c.gradeName}` : ""}</option>)}
              </select>
            )}
          </div>
        )}

        {isPremium ? (
          <div className="brick rounded-2xl p-6 border text-center" style={{ borderColor: "var(--green)", background: "var(--green-soft)" }}>
            <Check size={28} className="mx-auto text-(--green) mb-2" />
            <h2 className="disp text-xl font-bold">Premium is active</h2>
            {status?.currentPeriodEnd && <p className="text-sm text-(--ink-soft) mt-1">Renews {new Date(status.currentPeriodEnd).toLocaleDateString()}</p>}
          </div>
        ) : (
          <>
            <div className="brick bg-white rounded-2xl p-6 border" style={{ borderColor: "var(--slate)" }}>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="disp text-4xl font-bold">KES {status?.priceKes ?? 300}</span>
                <span className="text-sm text-(--ink-soft)">/ month</span>
              </div>
              <div className="space-y-3">
                {FEATURES.map((f) => (
                  <div key={f.label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>{f.icon}</div>
                    <div>
                      <div className="text-sm font-semibold">{f.label}</div>
                      <div className="text-xs text-(--ink-soft)">{f.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              {status && !status.ai.unlimited && (
                <p className="text-xs text-(--ink-soft) mt-4">Free plan: {status.ai.usedToday}/{status.ai.dailyLimit} Ask Msingi messages used today.</p>
              )}
            </div>

            {stage === "idle" && (
              <div className="brick bg-white rounded-2xl p-5 border space-y-3" style={{ borderColor: "var(--slate)" }}>
                <label className="text-xs font-semibold text-(--ink-soft) block">M-Pesa phone number</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xx xxx xxx"
                  className="w-full border rounded-xl px-4 py-3 text-sm outline-none" style={{ borderColor: "var(--slate)" }} />
                {error && <p className="text-sm text-(--coral)">{error}</p>}
                <button disabled={!phone.trim() || (role === "PARENT" && !studentId)} onClick={startCheckout}
                  className="tap w-full px-6 py-3 rounded-full font-semibold text-white disabled:opacity-40" style={{ background: "var(--primary)" }}>
                  Pay with M-Pesa
                </button>
              </div>
            )}

            {stage === "pending" && (
              <div className="brick rounded-2xl p-6 border text-center" style={{ borderColor: "var(--primary)", background: "var(--primary-soft)" }}>
                <Loader2 size={24} className="mx-auto animate-spin text-(--primary) mb-2" />
                <p className="text-sm font-medium">Check your phone for the M-Pesa prompt and enter your PIN to complete payment.</p>
              </div>
            )}

            {stage === "demo-pending" && (
              <div className="brick rounded-2xl p-5 border text-center space-y-3" style={{ borderColor: "var(--gold-deep)", background: "var(--amber-soft)" }}>
                <p className="text-sm">Demo mode — M-Pesa isn&apos;t connected yet, so no real charge happens. Simulate a successful payment to try Premium.</p>
                <button onClick={confirmDemo} className="tap w-full px-6 py-3 rounded-full font-semibold text-white" style={{ background: "var(--gold-deep)" }}>Simulate successful payment</button>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}

export default function UpgradePage() {
  return <Suspense><UpgradeInner /></Suspense>;
}
