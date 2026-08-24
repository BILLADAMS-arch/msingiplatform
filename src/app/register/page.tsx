"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const GRADES = ["Grade 6", "Grade 7", "Grade 8", "Grade 9"];
const GOALS = ["Improve my grades", "Prepare for exams", "Practise every day", "Master difficult topics", "Explore new subjects"];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", password: "", gradeName: "Grade 7", goal: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const steps = [
    { title: "Welcome to Msingi 👋", canNext: form.name.trim().length > 0 && form.email.includes("@") && form.password.length >= 8 },
    { title: "What grade are you in?", canNext: !!form.gradeName },
    { title: "What's your goal?", canNext: !!form.goal },
  ];
  const isLast = step === steps.length - 1;

  async function submit() {
    setLoading(true); setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password, name: form.name, role: "STUDENT", gradeName: form.gradeName, goal: form.goal }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error?.formErrors?.[0] || body.error || "Registration failed.");
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    setLoading(false);
    if (signInError) { setError("Account created, but sign-in failed. Try logging in."); return; }
    await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ onboarded: true }) });
    router.push("/dashboard");
  }

  return (
    <div className="msingi min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md fade-in">
        <div className="flex gap-1.5 mb-8">
          {steps.map((_, i) => <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i <= step ? "var(--gold-deep)" : "var(--stone-2)" }} />)}
        </div>
        <h2 className="disp text-2xl font-bold mb-5">{steps[step].title}</h2>

        {step === 0 && (
          <div className="space-y-3">
            <input autoFocus placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--slate)" }} />
            <input type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--slate)" }} />
            <input type="password" placeholder="Password (min 8 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--slate)" }} />
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-2 gap-2">
            {GRADES.map((g) => (
              <button key={g} onClick={() => setForm({ ...form, gradeName: g })}
                className={`tap border rounded-xl px-4 py-3 text-sm font-medium text-left ${form.gradeName === g ? "text-white" : ""}`}
                style={{ borderColor: form.gradeName === g ? "var(--gold-deep)" : "var(--slate)", background: form.gradeName === g ? "var(--gold-deep)" : "white" }}>
                {g}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-2">
            {GOALS.map((g) => (
              <button key={g} onClick={() => setForm({ ...form, goal: g })}
                className={`tap border rounded-xl px-4 py-3 text-sm font-medium text-left ${form.goal === g ? "text-white" : ""}`}
                style={{ borderColor: form.goal === g ? "var(--gold-deep)" : "var(--slate)", background: form.goal === g ? "var(--gold-deep)" : "white" }}>
                {g}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-[--coral] mt-3">{error}</p>}

        <div className="flex justify-between mt-8">
          <button disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="tap px-4 py-2 text-sm font-medium disabled:opacity-30">Back</button>
          <button disabled={!steps[step].canNext || loading} onClick={() => (isLast ? submit() : setStep((s) => s + 1))}
            className="tap px-6 py-2.5 rounded-full font-semibold text-white disabled:opacity-40" style={{ background: "var(--ink)" }}>
            {loading ? "Creating account…" : isLast ? "Get started" : "Next"}
          </button>
        </div>
        <p className="text-center text-sm text-[--ink-soft] mt-6">Already have an account? <a href="/login" className="font-semibold text-[--gold-deep]">Log in</a></p>
      </div>
    </div>
  );
}
