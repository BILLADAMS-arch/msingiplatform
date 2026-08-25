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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError("Incorrect email or password."); return; }

    const callbackUrl = params.get("callbackUrl");
    if (callbackUrl) { router.push(callbackUrl); return; }

    // No explicit destination — route by role instead of always assuming
    // /dashboard, which is STUDENT-only (a Teacher/Parent/Admin landing
    // there gets 403s from the student-only APIs it calls).
    const role = data.user?.app_metadata?.role;
    const home = role === "TEACHER" ? "/teacher" : role === "PARENT" ? "/parent" : role === "ADMIN" ? "/admin" : "/dashboard";
    router.push(home);
  }

  return (
    <div className="msingi min-h-screen flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm fade-in space-y-4">
        <div className="flex items-center justify-center mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-full.png" alt="Msingi" className="h-16 object-contain" />
        </div>
        <h1 className="disp text-3xl font-bold text-center">Welcome back</h1>
        <input type="email" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--slate)" }} />
        <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--slate)" }} />
        <div className="text-right -mt-2"><a href="/forgot-password" className="text-xs font-semibold text-[--primary]">Forgot password?</a></div>
        {error && <p className="text-sm text-[--coral]">{error}</p>}
        <button disabled={loading} type="submit" className="tap w-full px-6 py-3 rounded-full font-semibold text-white disabled:opacity-50" style={{ background: "var(--primary)" }}>
          {loading ? "Signing in…" : "Log in"}
        </button>
        <p className="text-center text-sm text-[--ink-soft]">New to Msingi? <a href="/register" className="font-semibold text-[--primary]">Create an account</a></p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
