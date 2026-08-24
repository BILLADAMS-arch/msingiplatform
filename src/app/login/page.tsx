"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError("Incorrect email or password."); return; }
    router.push(params.get("callbackUrl") || "/dashboard");
  }

  return (
    <div className="msingi min-h-screen flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm fade-in space-y-4">
        <div className="flex items-center gap-2 justify-center mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center disp font-bold text-white" style={{ background: "var(--ink)" }}>M</div>
          <span className="disp font-bold text-lg">Msingi</span>
        </div>
        <h1 className="disp text-2xl font-bold text-center">Welcome back</h1>
        <input type="email" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--slate)" }} />
        <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--slate)" }} />
        {error && <p className="text-sm text-[--coral]">{error}</p>}
        <button disabled={loading} type="submit" className="tap w-full px-6 py-3 rounded-full font-semibold text-white disabled:opacity-50" style={{ background: "var(--ink)" }}>
          {loading ? "Signing in…" : "Log in"}
        </button>
        <p className="text-center text-sm text-[--ink-soft]">New to Msingi? <a href="/register" className="font-semibold text-[--gold-deep]">Create an account</a></p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
