"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Shell } from "@/components/shell";
import { Pill } from "@/components/ui";
import { ChevronRight } from "lucide-react";

type Lesson = {
  id: string; title: string; topicName: string;
  sections: { kind: string; heading: string; body: string; note: string | null }[];
  quickCheck: { question: string; options: string[]; correctIndex: number; explanation: string } | null;
};

const TONE: Record<string, "gold" | "green" | "coral"> = { learn: "gold", example: "green", keypoint: "coral", vocab: "gold" };

export default function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [idx, setIdx] = useState(0);
  const [checking, setChecking] = useState(false);
  const [chosen, setChosen] = useState<number | null>(null);

  useEffect(() => { fetch(`/api/lessons/${lessonId}`).then((r) => r.json()).then(setLesson); }, [lessonId]);

  if (!lesson) return <Shell><p className="text-sm text-[--ink-soft]">Loading lesson…</p></Shell>;

  const atQuickCheck = idx === lesson.sections.length;

  async function finish() {
    if (!lesson) return;
    await fetch(`/api/lessons/${lessonId}/complete`, { method: "POST" });
    router.push(`/practice?topic=${encodeURIComponent(lesson.topicName)}`);
  }

  if (!atQuickCheck) {
    const s = lesson.sections[idx];
    return (
      <Shell>
        <div className="fade-in max-w-2xl mx-auto space-y-6">
          <h1 className="disp text-2xl font-bold">{lesson.title}</h1>
          <div className="flex gap-1.5">{lesson.sections.map((_, i) => <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i <= idx ? "var(--gold-deep)" : "var(--stone-2)" }} />)}</div>
          <div className="brick bg-white rounded-2xl p-6 border" style={{ borderColor: "var(--slate)" }}>
            <Pill tone={TONE[s.kind] || "gold"}>{s.heading}</Pill>
            <p className="mt-3 text-[15px] leading-relaxed">{s.body}</p>
            {s.note && <p className="mt-2 text-sm text-[--ink-soft] italic">{s.note}</p>}
          </div>
          <div className="flex justify-end">
            <button onClick={() => setIdx((i) => i + 1)} className="tap px-6 py-2.5 rounded-full font-semibold text-white flex items-center gap-1" style={{ background: "var(--ink)" }}>
              {idx === lesson.sections.length - 1 ? "Quick Check" : "Next"} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (!lesson.quickCheck) { finish(); return null; }
  const qc = lesson.quickCheck;
  const correct = chosen === qc.correctIndex;

  return (
    <Shell>
      <div className="fade-in max-w-2xl mx-auto space-y-6">
        <h1 className="disp text-2xl font-bold">Quick Check</h1>
        <div className="brick bg-white rounded-2xl p-6 border" style={{ borderColor: "var(--slate)" }}>
          <p className="font-medium mb-4">{qc.question}</p>
          <div className="grid grid-cols-2 gap-3">
            {qc.options.map((opt, i) => {
              let style: React.CSSProperties = { borderColor: "var(--slate)", background: "white" };
              if (checking) {
                if (i === qc.correctIndex) style = { borderColor: "var(--green)", background: "var(--green-soft)" };
                else if (i === chosen) style = { borderColor: "var(--coral)", background: "var(--coral-soft)" };
              }
              return (
                <button key={i} disabled={checking} onClick={() => setChosen(i)} className="tap border rounded-xl px-4 py-3 text-sm font-medium text-left" style={{ ...style, outline: chosen === i && !checking ? "2px solid var(--gold-deep)" : "none" }}>
                  {String.fromCharCode(65 + i)}. {opt}
                </button>
              );
            })}
          </div>
          {!checking ? (
            <button disabled={chosen === null} onClick={() => setChecking(true)} className="tap mt-5 px-6 py-2.5 rounded-full font-semibold text-white disabled:opacity-40" style={{ background: "var(--ink)" }}>Check Answer</button>
          ) : (
            <div className="mt-5 fade-in">
              <p className={`font-semibold mb-1 ${correct ? "text-[--green]" : "text-[--coral]"}`}>{correct ? "Correct! 🎉" : "Not quite. Let's understand why."}</p>
              <p className="text-sm text-[--ink-soft]">{qc.explanation}</p>
              <button onClick={finish} className="tap mt-4 px-6 py-2.5 rounded-full font-semibold text-white" style={{ background: "var(--gold-deep)" }}>Continue to Practice</button>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
