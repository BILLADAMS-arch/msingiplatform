"use client";
import { useMemo, useState } from "react";
import { Shuffle, Delete } from "lucide-react";

const WORDS: Record<"English" | "Kiswahili", { word: string; hint: string }[]> = {
  English: [
    { word: "ecosystem", hint: "A community of living things interacting with their environment." },
    { word: "evaporation", hint: "The process of a liquid turning into vapour when heated." },
    { word: "biodiversity", hint: "The variety of living species in an area." },
    { word: "adjective", hint: "A word that describes a noun, e.g. 'tall', 'blue'." },
    { word: "photosynthesis", hint: "How plants make their own food using sunlight." },
  ],
  Kiswahili: [
    { word: "methali", hint: "Msemo wa hekima unaotumika kutoa mafunzo (a proverb)." },
    { word: "nahau", hint: "Msemo wenye maana tofauti na maneno yenyewe (an idiom)." },
    { word: "sarufi", hint: "Kanuni za lugha (grammar)." },
    { word: "msamiati", hint: "Orodha ya maneno ya lugha (vocabulary)." },
    { word: "ufahamu", hint: "Uwezo wa kuelewa kile kilichosomwa (comprehension)." },
  ],
};

function shuffleLetters(word: string): string[] {
  const letters = word.split("");
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters;
}

export function VocabularyChallenge({ onFirstUse }: { onFirstUse: () => void }) {
  const [language, setLanguage] = useState<"English" | "Kiswahili">("English");
  const [index, setIndex] = useState(0);
  const [built, setBuilt] = useState<number[]>([]);
  const [status, setStatus] = useState<"playing" | "correct" | "wrong">("playing");
  const [used, setUsed] = useState(false);

  const current = WORDS[language][index];
  const scrambled = useMemo(() => shuffleLetters(current.word), [current.word]);

  function pick(letterIdx: number) {
    if (status !== "playing" || built.includes(letterIdx)) return;
    setBuilt((b) => [...b, letterIdx]);
  }
  function backspace() { setBuilt((b) => b.slice(0, -1)); }

  function check() {
    const attempt = built.map((i) => scrambled[i]).join("");
    const correct = attempt === current.word;
    setStatus(correct ? "correct" : "wrong");
    if (!used) { setUsed(true); onFirstUse(); }
  }

  function next() {
    setIndex((i) => (i + 1) % WORDS[language].length);
    setBuilt([]);
    setStatus("playing");
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-2">
        {(["English", "Kiswahili"] as const).map((l) => (
          <button key={l} onClick={() => { setLanguage(l); setIndex(0); setBuilt([]); setStatus("playing"); }} className={`tap px-4 py-2 rounded-full border text-sm font-semibold ${language === l ? "text-white" : ""}`}
            style={{ borderColor: language === l ? "var(--gold-deep)" : "var(--slate)", background: language === l ? "var(--gold-deep)" : "white" }}>
            {l}
          </button>
        ))}
      </div>

      <p className="text-sm text-center text-[--ink-soft] max-w-sm mx-auto">{current.hint}</p>

      <div className="flex justify-center gap-1.5 flex-wrap min-h-10">
        {built.length === 0 ? (
          <span className="text-sm text-[--ink-soft] italic">Tap letters below to spell the word…</span>
        ) : built.map((i) => (
          <div key={i} className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white uppercase" style={{ background: "var(--ink)" }}>{scrambled[i]}</div>
        ))}
      </div>

      <div className="flex justify-center gap-1.5 flex-wrap">
        {scrambled.map((letter, i) => (
          <button key={i} disabled={built.includes(i) || status !== "playing"} onClick={() => pick(i)}
            className="tap w-9 h-9 rounded-lg border font-bold uppercase disabled:opacity-25" style={{ borderColor: "var(--slate)" }}>
            {letter}
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-2">
        <button onClick={backspace} disabled={status !== "playing"} className="tap flex items-center gap-1 px-3 py-2 rounded-full border text-xs font-semibold disabled:opacity-40" style={{ borderColor: "var(--slate)" }}><Delete size={12} /> Back</button>
        {status === "playing" ? (
          <button disabled={built.length !== current.word.length} onClick={check} className="tap px-5 py-2 rounded-full font-semibold text-sm text-white disabled:opacity-40" style={{ background: "var(--ink)" }}>Check</button>
        ) : (
          <button onClick={next} className="tap flex items-center gap-1 px-5 py-2 rounded-full font-semibold text-sm text-white" style={{ background: "var(--gold-deep)" }}><Shuffle size={14} /> Next word</button>
        )}
      </div>

      {status === "correct" && <p className="text-center text-sm font-semibold text-[--green]">Correct! 🎉</p>}
      {status === "wrong" && <p className="text-center text-sm font-semibold text-[--coral]">Not quite — the word was &quot;{current.word}&quot;.</p>}
    </div>
  );
}
