"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Shell } from "@/components/shell";
import { FoundationBar, Pill } from "@/components/ui";
import { Dumbbell, Trophy } from "lucide-react";

type PracticeQuestion = { attemptKey: string; id: string; type: string; prompt: string; difficulty: string; options: { id: string; label: string }[] };

function PracticeInner() {
  const params = useSearchParams();
  const router = useRouter();
  const requestedTopic = params.get("topic");
  const [defaultTopic, setDefaultTopic] = useState<string | null>(null);
  const topic = requestedTopic ?? defaultTopic;

  // No ?topic= given (e.g. landed here from the nav bar directly) — pick a
  // real one: the learner's weakest topic in progress, or their first
  // available topic, rather than defaulting to any specific subject.
  useEffect(() => {
    if (requestedTopic) return;
    fetch("/api/progress/me").then((r) => r.json()).then(async (p) => {
      const weakest = Object.entries(p.topicMastery as Record<string, number>).filter(([, v]) => v > 0 && v < 70).sort((a, b) => a[1] - b[1])[0];
      if (weakest) { setDefaultTopic(weakest[0]); return; }
      const profile = await fetch("/api/profile").then((r) => r.json());
      if (!profile.gradeName) return;
      const subjRes = await fetch(`/api/curriculum/subjects?grade=${encodeURIComponent(profile.gradeName)}`).then((r) => r.json());
      const firstSubject = subjRes.subjects?.[0];
      if (!firstSubject) return;
      const roadmap = await fetch(`/api/curriculum/roadmap?subjectId=${firstSubject.id}`).then((r) => r.json());
      const firstTopic = roadmap.roadmap?.find((t: { lessonId: string | null }) => t.lessonId);
      if (firstTopic) setDefaultTopic(firstTopic.name);
    });
  }, [requestedTopic]);

  const [started, setStarted] = useState(false);
  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState<PracticeQuestion[] | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ isCorrect: boolean; correctOptionId?: string; correctLabel: string; explanation: string } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  async function start() {
    if (!topic) return;
    setStarted(true);
    const res = await fetch(`/api/practice?topic=${encodeURIComponent(topic)}&count=${count}`).then((r) => r.json());
    setQuestions(res.questions);
  }

  async function submit() {
    if (!questions) return;
    const q = questions[qIdx];
    const isNumerical = q.type === "numerical";
    const isShortAnswer = q.type === "short_answer";
    if (isNumerical || isShortAnswer) { if (!freeText.trim()) return; } else if (!chosen) return;

    const res = await fetch("/api/practice/attempts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: q.id,
        ...(isNumerical ? { answerNumeric: Number(freeText) } : isShortAnswer ? { answerText: freeText } : { chosenOptionId: chosen }),
      }),
    }).then((r) => r.json());
    setResult(res);
    setChecking(true);
    if (res.isCorrect) setCorrectCount((c) => c + 1);
  }

  function next() { setChecking(false); setChosen(null); setFreeText(""); setResult(null); setQIdx((i) => i + 1); }

  if (!started) {
    return (
      <Shell>
        <div className="fade-in max-w-md mx-auto text-center space-y-6 py-10">
          <Dumbbell size={36} className="mx-auto text-[--gold-deep]" />
          {!topic ? (
            <>
              <h1 className="disp text-2xl font-bold">Practice</h1>
              <p className="text-sm text-[--ink-soft]">Finding something for you to practise…</p>
            </>
          ) : (
            <>
              <h1 className="disp text-2xl font-bold">Practise {topic}</h1>
              <p className="text-sm text-[--ink-soft]">Choose how many questions you'd like to try.</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {[5, 10, 20].map((c) => (
                  <button key={c} onClick={() => setCount(c)} className={`tap px-4 py-2 rounded-full border text-sm font-semibold ${count === c ? "text-white" : ""}`} style={{ borderColor: count === c ? "var(--gold-deep)" : "var(--slate)", background: count === c ? "var(--gold-deep)" : "white" }}>{c} questions</button>
                ))}
              </div>
              <button onClick={start} className="tap px-6 py-3 rounded-full font-semibold text-white" style={{ background: "var(--ink)" }}>Start Practice</button>
            </>
          )}
        </div>
      </Shell>
    );
  }

  if (!questions) return <Shell><p className="text-sm text-[--ink-soft]">Loading questions…</p></Shell>;

  if (qIdx >= questions.length) {
    return (
      <Shell>
        <div className="fade-in max-w-md mx-auto text-center space-y-4 py-10">
          <Trophy size={36} className="mx-auto text-[--gold-deep]" />
          <h1 className="disp text-2xl font-bold">Practice Complete!</h1>
          <p className="text-[--ink-soft]">You got <b>{correctCount}</b> out of <b>{questions.length}</b> correct.</p>
          <button onClick={() => router.push("/dashboard")} className="tap px-6 py-3 rounded-full font-semibold text-white" style={{ background: "var(--gold-deep)" }}>Back to Dashboard</button>
        </div>
      </Shell>
    );
  }

  const q = questions[qIdx];
  return (
    <Shell>
      <div className="fade-in max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between text-sm text-[--ink-soft]">
          <span>Question {qIdx + 1} of {questions.length}</span>
          <Pill tone={q.difficulty === "hard" ? "coral" : q.difficulty === "medium" ? "gold" : "green"}>{q.difficulty}</Pill>
        </div>
        <FoundationBar pct={(qIdx / questions.length) * 100} />
        <div className="brick bg-white rounded-2xl p-6 border" style={{ borderColor: "var(--slate)" }}>
          <p className="font-medium mb-4">{q.prompt}</p>

          {q.type === "short_answer" || q.type === "numerical" ? (
            <input
              type={q.type === "numerical" ? "number" : "text"}
              value={freeText}
              disabled={checking}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder={q.type === "numerical" ? "Enter a number" : "Type your answer"}
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-60"
              style={{ borderColor: checking ? (result?.isCorrect ? "var(--green)" : "var(--coral)") : "var(--slate)" }}
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {q.options.map((opt, i) => {
                let style: React.CSSProperties = { borderColor: "var(--slate)", background: "white" };
                if (checking && result) {
                  if (opt.id === result.correctOptionId) style = { borderColor: "var(--green)", background: "var(--green-soft)" };
                  else if (opt.id === chosen) style = { borderColor: "var(--coral)", background: "var(--coral-soft)" };
                }
                return (
                  <button key={opt.id} disabled={checking} onClick={() => setChosen(opt.id)} className="tap border rounded-xl px-4 py-3 text-sm font-medium text-left" style={{ ...style, outline: chosen === opt.id && !checking ? "2px solid var(--gold-deep)" : "none" }}>
                    {String.fromCharCode(65 + i)}. {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {!checking ? (
            <button disabled={q.type === "short_answer" || q.type === "numerical" ? !freeText.trim() : !chosen} onClick={submit} className="tap mt-5 px-6 py-2.5 rounded-full font-semibold text-white disabled:opacity-40" style={{ background: "var(--ink)" }}>Check Answer</button>
          ) : (
            <div className="mt-5 fade-in">
              <p className={`font-semibold mb-1 ${result?.isCorrect ? "text-[--green]" : "text-[--coral]"}`}>{result?.isCorrect ? "Correct! 🎉" : "Not quite. Let's understand why."}</p>
              {!result?.isCorrect && result?.correctLabel && <p className="text-sm mb-1">Correct answer: <b>{result.correctLabel}</b></p>}
              <p className="text-sm text-[--ink-soft]">{result?.explanation}</p>
              <button onClick={next} className="tap mt-4 px-6 py-2.5 rounded-full font-semibold text-white" style={{ background: "var(--gold-deep)" }}>Next</button>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

export default function PracticePage() {
  return <Suspense><PracticeInner /></Suspense>;
}
