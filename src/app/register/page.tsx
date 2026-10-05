"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Grade = { id: string; name: string; hasSubjects: boolean };
const GOALS = ["Improve my grades", "Prepare for exams", "Practise every day", "Master difficult topics", "Explore new subjects"];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", password: "", gradeId: "", goal: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Grades come from the database; only grades that have content are offered.
  const [grades, setGrades] = useState<Grade[] | null | "error">(null);

  function fetchGrades() {
    fetch("/api/curriculum/grades")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((d: { grades: Grade[] }) => setGrades(d.grades.filter((g) => g.hasSubjects)))
      .catch(() => setGrades("error"));
  }
  useEffect(fetchGrades, []);
  const retryGrades = () => { setGrades(null); fetchGrades(); };

  const steps = [
    { title: "Welcome to Msingi 👋", canNext: form.name.trim().length > 0 && form.email.includes("@") && form.password.length >= 8 },
    { title: "What grade are you in?", canNext: !!form.gradeId },
    { title: "What's your goal?", canNext: !!form.goal },
  ];
  const isLast = step === steps.length - 1;

  async function submit() {
    setLoading(true); setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, password: form.password, name: form.name, role: "STUDENT", gradeId: form.gradeId, goal: form.goal }),
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
          {steps.map((_, i) => <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i <= step ? "var(--primary)" : "var(--stone-2)" }} />)}
        </div>
        <h2 className="disp text-2xl font-bold mb-5">{steps[step].title}</h2>

        {step === 0 && (
          <div className="space-y-3">
            <input autoFocus placeholder="Your name" aria-label="Your name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--slate)" }} />
            <input type="email" placeholder="Email address" aria-label="Email address" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--slate)" }} />
            <input type="password" placeholder="Password (min 8 characters)" aria-label="Password (min 8 characters)" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--slate)" }} />
          </div>
        )}

        {step === 1 && (
          grades === null ? (
            <p className="text-sm text-(--ink-soft)" role="status">Loading grades…</p>
          ) : grades === "error" ? (
            <p className="text-sm text-(--coral)">Couldn&apos;t load grades. <button onClick={retryGrades} className="font-semibold underline">Try again</button></p>
          ) : grades.length === 0 ? (
            <p className="text-sm text-(--ink-soft)">No grades are open for sign-up yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {grades.map((g) => (
                <button key={g.id} onClick={() => setForm({ ...form, gradeId: g.id })}
                  className={`tap border rounded-xl px-4 py-3 text-sm font-medium text-left ${form.gradeId === g.id ? "text-white" : ""}`}
                  style={{ borderColor: form.gradeId === g.id ? "var(--primary)" : "var(--slate)", background: form.gradeId === g.id ? "var(--primary)" : "white" }}>
                  {g.name}
                </button>
              ))}
            </div>
          )
        )}

        {step === 2 && (
          <div className="flex flex-col gap-2">
            {GOALS.map((g) => (
              <button key={g} onClick={() => setForm({ ...form, goal: g })}
                className={`tap border rounded-xl px-4 py-3 text-sm font-medium text-left ${form.goal === g ? "text-white" : ""}`}
                style={{ borderColor: form.goal === g ? "var(--primary)" : "var(--slate)", background: form.goal === g ? "var(--primary)" : "white" }}>
                {g}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-(--coral) mt-3">{error}</p>}

        <div className="flex justify-between mt-8">
          <button disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="tap px-4 py-2 text-sm font-medium disabled:opacity-30">Back</button>
          <button disabled={!steps[step].canNext || loading} onClick={() => (isLast ? submit() : setStep((s) => s + 1))}
            className="tap px-6 py-2.5 rounded-full font-semibold text-white disabled:opacity-40" style={{ background: "var(--primary)" }}>
            {loading ? "Creating account…" : isLast ? "Get started" : "Next"}
          </button>
        </div>
        <p className="text-center text-sm text-(--ink-soft) mt-6">Already have an account? <a href="/login" className="font-semibold text-(--primary)">Log in</a></p>
      </div>
    </div>
  );
}
