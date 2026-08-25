"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  return (
    <div className="msingi min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm fade-in space-y-4">
        <div className="flex items-center justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.png" alt="Msingi" className="h-24 object-contain" />
        </div>
        <h1 className="disp text-3xl font-bold text-center">Reset your password</h1>
        {sent ? (
          <p className="text-sm text-[--ink-soft] text-center">If an account exists for {email}, we&apos;ve sent a password reset link — check your inbox.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-[--ink-soft] text-center">Enter your account email and we&apos;ll send you a reset link.</p>
            <input type="email" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--slate)" }} />
            {error && <p className="text-sm text-[--coral]">{error}</p>}
            <button disabled={loading} type="submit" className="tap w-full px-6 py-3 rounded-full font-semibold text-white disabled:opacity-50" style={{ background: "var(--primary)" }}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
        <p className="text-center text-sm text-[--ink-soft]"><a href="/login" className="font-semibold text-[--primary]">Back to log in</a></p>
      </div>
    </div>
  );
}
