"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { ClipboardCheck } from "lucide-react";

type Test = { id: string; title: string; type: string; timeLimitSeconds: number | null };

export default function TestsPage() {
  const [tests, setTests] = useState<Test[] | null>(null);

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then(async (p) => {
      if (!p.gradeName) return;
      const subjRes = await fetch(`/api/curriculum/subjects?grade=${encodeURIComponent(p.gradeName)}`).then((r) => r.json());
      const math = subjRes.subjects?.find((s: { name: string }) => s.name === "Mathematics");
      if (!math) return;
      const testsRes = await fetch(`/api/tests?subjectId=${math.id}`).then((r) => r.json());
      setTests(testsRes.tests);
    });
  }, []);

  return (
    <Shell>
      <div className="fade-in space-y-6 max-w-lg mx-auto text-center py-6">
        <ClipboardCheck size={36} className="mx-auto text-[--gold-deep]" />
        <h1 className="disp text-2xl font-bold">Tests</h1>
        {!tests ? (
          <p className="text-sm text-[--ink-soft]">Loading tests…</p>
        ) : tests.length === 0 ? (
          <p className="text-sm text-[--ink-soft]">No tests published for your grade yet.</p>
        ) : (
          <div className="space-y-3">
            {tests.map((t) => (
              <Link key={t.id} href={`/tests/${t.id}`} className="tap block bg-white rounded-2xl p-5 border text-left" style={{ borderColor: "var(--slate)" }}>
                <div className="font-semibold">{t.title}</div>
                <div className="text-xs text-[--ink-soft] mt-1">{t.type} · {t.timeLimitSeconds ? `${Math.round(t.timeLimitSeconds / 60)} min` : "untimed"}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
