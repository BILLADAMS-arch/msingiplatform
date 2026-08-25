"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Shell } from "@/components/shell";
import { Sparkles, Send } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const STARTERS = ["Explain fractions to me", "Quiz me on Algebra", "Help me understand ratios", "Give me another example of equivalent fractions"];

function AiInner() {
  const params = useSearchParams();
  const mistakeId = params.get("mistakeId");

  const [messages, setMessages] = useState<Message[] | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const askedMistakeRef = useRef(false);

  useEffect(() => {
    fetch("/api/ai/conversation").then((r) => r.json()).then((d) => setMessages(d.messages ?? []));
  }, []);

  useEffect(() => {
    if (mistakeId && messages !== null && !askedMistakeRef.current) {
      askedMistakeRef.current = true;
      send(undefined, mistakeId);
    }
  }, [mistakeId, messages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);

  async function send(text?: string, forMistakeId?: string) {
    const message = text ?? input;
    if (!forMistakeId && !message.trim()) return;
    setSending(true);
    setInput("");
    setMessages((ms) => [...(ms ?? []), { role: "user", content: forMistakeId ? "Why is my answer wrong?" : message }]);
    setStreaming("");

    const res = await fetch("/api/ai/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forMistakeId ? { mistakeId: forMistakeId } : { message }),
    });

    if (!res.ok || !res.body) {
      setStreaming("Sorry, something went wrong. Please try again.");
      setSending(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      full += decoder.decode(value, { stream: true });
      setStreaming(full);
    }
    setMessages((ms) => [...(ms ?? []), { role: "assistant", content: full }]);
    setStreaming("");
    setSending(false);
  }

  return (
    <Shell>
      <div className="fade-in max-w-2xl mx-auto flex flex-col" style={{ height: "calc(100vh - 140px)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={20} className="text-[--primary]" />
          <h1 className="disp text-3xl font-bold">Msingi AI</h1>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {messages === null ? (
            <p className="text-sm text-[--ink-soft]">Loading…</p>
          ) : messages.length === 0 && !streaming ? (
            <div className="text-center py-10">
              <p className="text-sm text-[--ink-soft] mb-4">Ask me to explain a concept, quiz you, or work through an example.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="tap px-3 py-2 rounded-full border text-xs font-medium" style={{ borderColor: "var(--slate)" }}>{s}</button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap"
                    style={{ background: m.role === "user" ? "var(--primary)" : "white", color: m.role === "user" ? "white" : "var(--ink)", border: m.role === "assistant" ? "1px solid var(--slate)" : "none" }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {streaming && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap border" style={{ borderColor: "var(--slate)" }}>{streaming}</div>
                </div>
              )}
              {sending && !streaming && (
                <div className="flex justify-start"><div className="rounded-2xl px-4 py-2.5 text-sm text-[--ink-soft] border" style={{ borderColor: "var(--slate)" }}>Thinking…</div></div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: "var(--slate)" }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !sending && send()}
            placeholder="Ask Msingi AI…" disabled={sending}
            className="flex-1 border rounded-full px-4 py-2.5 text-sm outline-none disabled:opacity-60" style={{ borderColor: "var(--slate)" }} />
          <button onClick={() => send()} disabled={sending || !input.trim()} className="tap w-11 h-11 rounded-full flex items-center justify-center text-white disabled:opacity-40" style={{ background: "var(--primary)" }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </Shell>
  );
}

export default function AiPage() {
  return <Suspense><AiInner /></Suspense>;
}
