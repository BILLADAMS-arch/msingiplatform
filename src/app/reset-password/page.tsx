"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    // The recovery link's session is already active in this browser tab —
    // @supabase/ssr picks it up from the URL fragment automatically.
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <div className="msingi min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm fade-in space-y-4">
        <div className="flex items-center justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.png" alt="Msingi" className="h-16 object-contain" />
        </div>
        <h1 className="disp text-2xl font-bold text-center">Choose a new password</h1>
        {done ? (
          <p className="text-sm text-[--green] text-center">Password updated — redirecting you to log in…</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <input type="password" required placeholder="New password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--slate)" }} />
            <input type="password" required placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full border rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--slate)" }} />
            {error && <p className="text-sm text-[--coral]">{error}</p>}
            <button disabled={loading} type="submit" className="tap w-full px-6 py-3 rounded-full font-semibold text-white disabled:opacity-50" style={{ background: "var(--ink)" }}>
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
