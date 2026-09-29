"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, EmptyState, ErrorState, Skeleton, LoadingState } from "@/components/ui";
import { subjectAccent } from "@/lib/subject-colors";
import { ClipboardCheck, Clock, Target, ChevronRight } from "lucide-react";

type Test = { id: string; title: string; type: string; timeLimitSeconds: number | null; passingThreshold: number; subjectName: string };
type Load = { status: "loading" } | { status: "error" } | { status: "ready"; tests: Test[]; gradeName: string | null };

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
}

export default function TestsPage() {
  const [load, setLoad] = useState<Load>({ status: "loading" });

  // Published tests for every subject in the learner's grade (same requests as before).
  const fetchTests = useCallback(() => {
    (async () => {
      const p = await getJson<{ gradeName: string | null }>("/api/profile");
      if (!p.gradeName) return setLoad({ status: "ready", tests: [], gradeName: null });
      const { subjects } = await getJson<{ subjects: { id: string; name: string }[] }>(`/api/curriculum/subjects?grade=${encodeURIComponent(p.gradeName)}`);
      const perSubject = await Promise.all(subjects.map((s) =>
        getJson<{ tests: Omit<Test, "subjectName">[] }>(`/api/tests?subjectId=${s.id}`).then((d) => (d.tests ?? []).map((t) => ({ ...t, subjectName: s.name }))),
      ));
      setLoad({ status: "ready", tests: perSubject.flat(), gradeName: p.gradeName });
    })().catch(() => setLoad({ status: "error" }));
  }, []);
  useEffect(() => { fetchTests(); }, [fetchTests]);

  return (
    <Shell>
      <div className="fade-in max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="disp text-2xl sm:text-3xl">Tests</h1>
          <p className="text-sm text-(--ink-soft) mt-1">
            Check what you really understand. After each test you&apos;ll see your score by topic and what to practise next.
          </p>
        </header>

        {load.status === "loading" ? (
          <LoadingState label="Loading tests"><div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div></LoadingState>
        ) : load.status === "error" ? (
          <Card><ErrorState title="We couldn't load your tests" onRetry={() => { setLoad({ status: "loading" }); fetchTests(); }} /></Card>
        ) : load.tests.length === 0 ? (
          <Card>
            <EmptyState icon={<ClipboardCheck size={22} />} title="No tests yet"
              description={load.gradeName ? `No tests have been published for ${load.gradeName} yet.` : "Your account doesn't have a grade yet, so there are no tests to show."} />
          </Card>
        ) : (
          <ul className="grid gap-3">
            {load.tests.map((t) => {
              const accent = subjectAccent(t.subjectName);
              return (
                <li key={t.id}>
                  <Link href={`/tests/${t.id}`} className="group block rounded-2xl">
                    <Card interactive padding="sm" className="flex items-center gap-4 group-hover:border-(--primary)">
                      <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: accent.soft, color: accent.color }} aria-hidden>
                        <ClipboardCheck size={20} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold leading-snug">{t.title}</div>
                        <div className="text-xs text-(--ink-soft) mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-semibold" style={{ color: accent.color }}>{t.subjectName}</span>
                          <span className="capitalize">{t.type}</span>
                          <span className="flex items-center gap-1"><Clock size={12} aria-hidden />{t.timeLimitSeconds ? `${Math.round(t.timeLimitSeconds / 60)} min` : "Untimed"}</span>
                          <span className="flex items-center gap-1"><Target size={12} aria-hidden />Pass mark {t.passingThreshold}%</span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-(--muted) shrink-0" aria-hidden />
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Shell>
  );
}
