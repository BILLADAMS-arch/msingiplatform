"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shell } from "@/components/shell";
import { FoundationBar, Pill, TopicChip } from "@/components/ui";
import { Clock, AlertCircle, ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";

type TQuestion = { id: string; prompt: string; topicId: string; options: { id: string; label: string }[] };
type StartResp = { attemptId: string; test: { id: string; title: string; timeLimitSeconds: number | null; passingThreshold: number }; questions: TQuestion[] };
type SubmitResult = {
  score: number; correct: number; total: number; timeTaken: string;
  byTopic: Record<string, { correct: number; total: number }>;
  previousScore: number | null; improvement: number | null; xpAwarded: number;
};

type Stage = "intro" | "taking" | "results" | "remediation";

export default function TestPage() {
  const { testId } = useParams<{ testId: string }>();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [session, setSession] = useState<StartResp | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [remediationStep, setRemediationStep] = useState(0);

  useEffect(() => {
    if (stage !== "taking") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [stage]);

  async function begin() {
    const res = await fetch(`/api/tests/${testId}/attempts`, { method: "POST" }).then((r) => r.json());
    setSession(res);
    setStage("taking");
  }

  async function submit() {
    if (!session) return;
    const payload = {
      answers: session.questions.map((q) => ({ questionId: q.id, chosenOptionId: answers[q.id] ?? null })),
      timeTakenSeconds: seconds,
    };
    const res = await fetch(`/api/tests/attempts/${session.attemptId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    }).then((r) => r.json());
    setResult(res);
    setStage("results");
  }

  if (stage === "intro") {
    return (
      <Shell>
        <div className="fade-in max-w-md mx-auto text-center space-y-5 py-10">
          <div className="disp text-2xl font-bold">Ready for a test?</div>
          <p className="text-sm text-[--ink-soft]">A Standard Test covers Fractions, Ratios and Percentages — 10 questions, timed. Your answers are graded on submit; nothing is revealed until then.</p>
          <button onClick={begin} className="tap px-6 py-3 rounded-full font-semibold text-white" style={{ background: "var(--ink)" }}>Start Test</button>
        </div>
      </Shell>
    );
  }

  if (stage === "taking" && session) {
    const q = session.questions[idx];
    const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    return (
      <Shell>
        <div className="fade-in max-w-2xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold"><Clock size={16} /> {mmss}</div>
            <div className="text-sm text-[--ink-soft]">Question {idx + 1} of {session.questions.length}</div>
          </div>
          <FoundationBar pct={(idx / session.questions.length) * 100} tone="gold" />
          <div className="flex gap-1.5 flex-wrap">
            {session.questions.map((qq, i) => (
              <button key={qq.id} onClick={() => setIdx(i)} className="tap w-7 h-7 rounded-lg text-xs font-semibold border"
                style={{ borderColor: "var(--slate)", background: i === idx ? "var(--ink)" : answers[qq.id] ? "var(--green-soft)" : "white", color: i === idx ? "white" : "var(--ink)" }}>
                {i + 1}
              </button>
            ))}
          </div>
          <div className="brick bg-white rounded-2xl p-6 border" style={{ borderColor: "var(--slate)" }}>
            <p className="font-medium mb-4 pr-4">{q.prompt}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {q.options.map((opt, i) => (
                <button key={opt.id} onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                  className="tap border rounded-xl px-4 py-3 text-sm font-medium text-left"
                  style={{ borderColor: answers[q.id] === opt.id ? "var(--gold-deep)" : "var(--slate)", background: answers[q.id] === opt.id ? "var(--amber-soft)" : "white" }}>
                  {String.fromCharCode(65 + i)}. {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between">
            <button disabled={idx === 0} onClick={() => setIdx((i) => i - 1)} className="tap px-4 py-2 text-sm font-medium disabled:opacity-30 flex items-center gap-1"><ChevronLeft size={16} />Previous</button>
            {idx < session.questions.length - 1 ? (
              <button onClick={() => setIdx((i) => i + 1)} className="tap px-6 py-2.5 rounded-full font-semibold text-white flex items-center gap-1" style={{ background: "var(--ink)" }}>Next <ChevronRight size={16} /></button>
            ) : (
              <button onClick={submit} className="tap px-6 py-2.5 rounded-full font-semibold text-white" style={{ background: "var(--green)" }}>Submit Test</button>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  if (stage === "results" && result) {
    const failed = result.score < 60;
    const weakTopics = Object.entries(result.byTopic).filter(([, v]) => v.correct / v.total < 0.6).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total).map(([t]) => t);
    return (
      <Shell>
        <div className="fade-in max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="disp text-3xl font-bold mb-1">{failed ? "Let's improve this 💪" : "Test Complete 🎉"}</h1>
            {failed && <p className="text-sm text-[--ink-soft] mb-3">You scored:</p>}
            <div className="disp text-5xl font-bold mt-2" style={{ color: failed ? "var(--coral)" : "var(--green)" }}>{result.score}%</div>
            {result.previousScore !== null && (
              <Pill tone={(result.improvement ?? 0) >= 0 ? "green" : "coral"}>{(result.improvement ?? 0) >= 0 ? "+" : ""}{result.improvement}% vs previous attempt</Pill>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="bg-white rounded-xl p-3 border" style={{ borderColor: "var(--slate)" }}><div className="font-bold text-lg">{result.correct}/{result.total}</div><div className="text-[--ink-soft] text-xs">Correct</div></div>
            <div className="bg-white rounded-xl p-3 border" style={{ borderColor: "var(--slate)" }}><div className="font-bold text-lg">{result.timeTaken}</div><div className="text-[--ink-soft] text-xs">Time taken</div></div>
            <div className="bg-white rounded-xl p-3 border" style={{ borderColor: "var(--slate)" }}><div className="font-bold text-lg">+{result.xpAwarded}</div><div className="text-[--ink-soft] text-xs">XP earned</div></div>
          </div>
          <div className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
            <h3 className="disp font-bold mb-3">Performance by Topic</h3>
            <div className="space-y-2">
              {Object.entries(result.byTopic).map(([t, v]) => <TopicChip key={t} label={t} pct={Math.round((v.correct / v.total) * 100)} />)}
            </div>
          </div>
          {failed ? (
            <div className="brick rounded-2xl p-5 border" style={{ borderColor: "var(--coral)", background: "var(--coral-soft)" }}>
              <h3 className="disp font-bold mb-2">You need more practice in:</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {weakTopics.map((t) => <Pill key={t} tone="coral">🔴 {t}</Pill>)}
              </div>
              <h3 className="disp font-bold mb-2">Your Revision Plan</h3>
              <ol className="text-sm space-y-1 list-decimal list-inside text-[--ink-soft]">
                <li>Review your weakest topic</li><li>Practise 5 targeted questions</li><li>Review your mistakes</li><li>Complete a mini quiz</li><li>Retake the test</li>
              </ol>
              <button onClick={() => setStage("remediation")} className="tap mt-4 w-full px-6 py-3 rounded-full font-semibold text-white" style={{ background: "var(--coral)" }}>Start Revision</button>
            </div>
          ) : (
            <button onClick={() => router.push("/dashboard")} className="tap w-full px-6 py-3 rounded-full font-semibold text-white" style={{ background: "var(--green)" }}>Continue</button>
          )}
        </div>
      </Shell>
    );
  }

  if (stage === "remediation" && result) {
    const weakTopics = Object.entries(result.byTopic).filter(([, v]) => v.correct / v.total < 0.6).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total).map(([t]) => t);
    const topic = weakTopics[0] || "Fractions";
    return (
      <Shell>
        <div className="fade-in max-w-xl mx-auto text-center space-y-5 py-10">
          {remediationStep < 2 ? (
            <>
              <Dumbbell size={36} className="mx-auto text-[--gold-deep]" />
              <h1 className="disp text-2xl font-bold">Review &amp; Practise: {topic}</h1>
              <p className="text-sm text-[--ink-soft]">Head to Practice for {topic}, then come back here to retake the test.</p>
              <a href={`/practice?topic=${encodeURIComponent(topic)}`} className="tap inline-block px-6 py-3 rounded-full font-semibold text-white" style={{ background: "var(--ink)" }}>Go Practise {topic}</a>
              <div>
                <button onClick={() => setRemediationStep(2)} className="text-sm font-semibold text-[--gold-deep] mt-4">I've practised — I'm ready</button>
              </div>
            </>
          ) : (
            <>
              <div className="disp text-2xl font-bold">You're ready to try again! 🚀</div>
              <p className="text-sm text-[--ink-soft]">Mistakes from this attempt are saved in your Mistake Book too.</p>
              <button onClick={() => { setStage("intro"); setResult(null); setAnswers({}); setIdx(0); setSeconds(0); setRemediationStep(0); }} className="tap px-6 py-3 rounded-full font-semibold text-white" style={{ background: "var(--gold-deep)" }}>Retake Test</button>
            </>
          )}
        </div>
      </Shell>
    );
  }

  return <Shell><p className="text-sm text-[--ink-soft]">Loading…</p></Shell>;
}
