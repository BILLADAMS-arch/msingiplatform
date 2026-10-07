"use client";
import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Shell } from "@/components/shell";
import { Button, EmptyState, ErrorState, Skeleton, LoadingState } from "@/components/ui";
import { Sparkles, ArrowUp, Crown, LogIn, BookMarked, Lightbulb, HelpCircle, ListChecks, RotateCcw, AlertTriangle, User } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string; createdAt: string };
type Quota = { usedToday: number; dailyLimit: number; unlimited: boolean };
type Suggestion = { label: string; prompt?: string; href?: string; icon: React.ReactNode };

const MAX_LEN = 2000; // /api/ai/chat accepts up to 2000 characters

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

/* Suggested prompts. They only fill the message box — the learner reviews and
   sends — so nothing is spent from the daily quota without them choosing. */
function starterSuggestions(topic: string | null, weakestTopic: string | null, hasMistakes: boolean): Suggestion[] {
  if (topic) {
    return [
      { label: `Explain ${topic} simply`, prompt: `Can you explain ${topic} in a simpler way, with an everyday example?`, icon: <Lightbulb size={16} /> },
      { label: `Practice question on ${topic}`, prompt: `Give me one practice question on ${topic}. Let me try it before you tell me the answer.`, icon: <ListChecks size={16} /> },
      { label: `Common mistakes in ${topic}`, prompt: `What are the most common mistakes learners make with ${topic}, and how do I avoid them?`, icon: <HelpCircle size={16} /> },
    ];
  }
  const s: Suggestion[] = [
    { label: "Explain a concept", prompt: "I'm stuck on a concept. Ask me which one, then explain it simply with an example.", icon: <Lightbulb size={16} /> },
    { label: "Give me a hint", prompt: "I'm working on a question. Give me a hint rather than the answer — I'll paste the question next.", icon: <HelpCircle size={16} /> },
    { label: "Quiz me", prompt: "Quiz me one question at a time. Ask me which topic first.", icon: <ListChecks size={16} /> },
  ];
  s.push(weakestTopic
    ? { label: `Help me revise ${weakestTopic}`, prompt: `Help me revise ${weakestTopic}. Start with the idea I most need to understand.`, icon: <RotateCcw size={16} /> }
    : { label: "Help me revise", prompt: "Help me make a short revision plan for this week.", icon: <RotateCcw size={16} /> });
  if (hasMistakes) s.push({ label: "Understand a mistake", href: "/mistakes", icon: <BookMarked size={16} /> });
  return s;
}

// Follow-ups that make sense mid-conversation.
const FOLLOW_UPS = [
  "Can you explain that more simply?",
  "Give me a hint, not the answer.",
  "Give me a similar question to try.",
  "Can you show another example?",
];

function AiInner() {
  const params = useSearchParams();
  const mistakeId = params.get("mistakeId");
  const topicParam = params.get("topic");

  const [messages, setMessages] = useState<{ status: "loading" } | { status: "signedOut" } | { status: "error" } | { status: "ready"; list: Message[] }>({ status: "loading" });
  const [input, setInput] = useState(() => (params.get("prompt") ?? "").slice(0, MAX_LEN));
  const [streaming, setStreaming] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<{ text: string; mistakeId?: string } | null>(null);
  const [limitReached, setLimitReached] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [learner, setLearner] = useState<{ weakestTopic: string | null; hasMistakes: boolean }>({ weakestTopic: null, hasMistakes: false });
  const [announcement, setAnnouncement] = useState("");

  const sendingRef = useRef(false);
  const askedMistakeRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchConversation = useCallback(() => {
    fetch("/api/ai/conversation")
      .then(async (r) => {
        if (r.status === 401) return setMessages({ status: "signedOut" });
        if (!r.ok) throw new Error();
        const d = await r.json();
        setMessages({ status: "ready", list: d.messages ?? [] });
      })
      .catch(() => setMessages({ status: "error" }));
  }, []);

  useEffect(() => {
    fetchConversation();
    // Real data for the header quota and personalised suggestions. Both are
    // optional — the chat works without them.
    fetch("/api/billing/status").then((r) => (r.ok ? r.json() : null)).then((d) => d?.ai && setQuota(d.ai)).catch(() => {});
    fetch("/api/progress/me").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return;
      const weakest = ((d.topics ?? []) as { name: string; masteryPct: number }[]).filter((t) => t.masteryPct < 70).sort((a, b) => a.masteryPct - b.masteryPct)[0];
      setLearner({ weakestTopic: weakest?.name ?? null, hasMistakes: (d.openMistakeCount ?? 0) > 0 });
    }).catch(() => {});
  }, [fetchConversation]);

  // Keep the newest message in view.
  const count = messages.status === "ready" ? messages.list.length : 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count, streaming, failed, limitReached]);

  // Grow the textarea with its content (up to ~6 lines).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [input]);

  const send = useCallback(async (text: string, forMistakeId?: string) => {
    const content = forMistakeId ? "Why is my answer wrong?" : text.trim();
    if (!content || sendingRef.current) return; // one request at a time — no double submits
    sendingRef.current = true;
    setSending(true);
    setFailed(null);
    setLimitReached(null);
    setAnnouncement("");
    if (!forMistakeId) setInput("");
    setMessages((m) => m.status === "ready" ? { ...m, list: [...m.list, { role: "user", content, createdAt: new Date().toISOString() }] } : m);
    const dropLastUser = () => setMessages((m) => m.status === "ready" ? { ...m, list: m.list.slice(0, -1) } : m);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(forMistakeId ? { mistakeId: forMistakeId } : { message: content }),
      });
      if (res.status === 401) { dropLastUser(); setMessages({ status: "signedOut" }); return; }
      if (res.status === 402) {
        const body = await res.json().catch(() => null);
        dropLastUser();
        if (!forMistakeId) setInput(content); // give their question back
        setLimitReached(body?.message ?? "You've used today's free Ask Msingi messages.");
        return;
      }
      if (!res.ok || !res.body) throw new Error(String(res.status));

      setStreaming("");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreaming(full);
      }
      if (!full.trim()) throw new Error("empty");
      setMessages((m) => m.status === "ready" ? { ...m, list: [...m.list, { role: "assistant", content: full, createdAt: new Date().toISOString() }] } : m);
      if (forMistakeId) fetchConversation(); // show the saved wording, which names the question
      setQuota((q) => (q ? { ...q, usedToday: q.usedToday + 1 } : q));
      setAnnouncement("Ask Msingi has replied.");
    } catch {
      // Leave their message visible and offer a retry. (An interrupted reply
      // isn't saved by the server, so we don't show a partial one either.)
      setFailed({ text: content, mistakeId: forMistakeId });
    } finally {
      setStreaming(null);
      sendingRef.current = false;
      setSending(false);
    }
  }, [fetchConversation]);

  function retry() {
    if (!failed) return;
    const f = failed;
    setMessages((m) => m.status === "ready" ? { ...m, list: m.list.slice(0, -1) } : m); // re-sent below
    send(f.text, f.mistakeId);
  }

  // Arriving from the Mistake Book (?mistakeId=): ask about it once, as before.
  const ready = messages.status === "ready";
  useEffect(() => {
    if (!mistakeId || !ready || askedMistakeRef.current) return;
    askedMistakeRef.current = true;
    const t = setTimeout(() => send("", mistakeId), 0);
    return () => clearTimeout(t);
  }, [mistakeId, ready, send]);

  function applySuggestion(prompt: string) {
    setInput(prompt);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) { el.focus(); el.setSelectionRange(prompt.length, prompt.length); }
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter adds a line; ignore Enter while an IME is composing.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  }

  const list = messages.status === "ready" ? messages.list : [];
  const remaining = quota && !quota.unlimited ? Math.max(0, quota.dailyLimit - quota.usedToday) : null;
  const starters = starterSuggestions(topicParam, learner.weakestTopic, learner.hasMistakes);

  return (
    <Shell>
      <div className="max-w-3xl mx-auto flex flex-col min-h-[26rem] h-[calc(100dvh-11.5rem-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-7rem)]">
        {/* Header */}
        <header className="flex items-start justify-between gap-3 pb-3 border-b border-(--slate)">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-(--primary-soft) text-(--primary-deep)" aria-hidden><Sparkles size={20} /></span>
            <div className="min-w-0">
              <h1 className="disp text-xl sm:text-2xl leading-tight">Ask Msingi</h1>
              <p className="text-xs text-(--ink-soft)">Stuck? Understand the concept — don&apos;t just get the answer.</p>
            </div>
          </div>
          {quota && (
            <span className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white border border-(--slate) text-(--ink-soft)">
              {quota.unlimited ? "Premium · unlimited" : `${remaining} of ${quota.dailyLimit} free left today`}
            </span>
          )}
        </header>

        {/* Conversation */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain py-4" role="log" aria-label="Conversation with Ask Msingi" aria-busy={sending}>
          {messages.status === "loading" ? (
            <LoadingState label="Loading your conversation">
              <div className="space-y-4"><Skeleton className="h-12 w-2/3 ml-auto" /><Skeleton className="h-24 w-4/5" /></div>
            </LoadingState>
          ) : messages.status === "signedOut" ? (
            <EmptyState icon={<LogIn size={22} />} title="Sign in to use Ask Msingi" description="Ask Msingi is available to signed-in students."
              action={<Button href="/login?callbackUrl=%2Fai">Sign in</Button>} />
          ) : messages.status === "error" ? (
            <ErrorState title="We couldn't load your conversation" onRetry={() => { setMessages({ status: "loading" }); fetchConversation(); }} />
          ) : list.length === 0 && streaming === null && !failed ? (
            <div className="py-6 sm:py-10 text-center max-w-lg mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon-sm.png" alt="" className="w-14 h-14 mx-auto object-contain" />
              <h2 className="disp text-xl sm:text-2xl mt-3">{topicParam ? `What would help with ${topicParam}?` : "What are you learning today?"}</h2>
              <p className="text-sm text-(--ink-soft) mt-2">
                Ask about anything you&apos;re studying. Msingi explains, gives hints and asks you questions — so you work it out yourself.
              </p>
              <p className="text-xs font-semibold text-(--ink-soft) mt-6 mb-2">Try one of these (you can edit it before sending)</p>
              <ul className="grid gap-2 sm:grid-cols-2 text-left">
                {starters.map((s) => (
                  <li key={s.label}>
                    {s.href ? (
                      <a href={s.href} className="tap flex items-center gap-2.5 min-h-12 px-3.5 rounded-xl border border-(--slate) bg-white text-sm font-semibold hover:border-(--primary)">
                        <span className="text-(--primary-deep)" aria-hidden>{s.icon}</span>{s.label}<span className="sr-only"> (opens your Mistake Book)</span>
                      </a>
                    ) : (
                      <button type="button" onClick={() => applySuggestion(s.prompt!)}
                        className="tap w-full flex items-center gap-2.5 min-h-12 px-3.5 rounded-xl border border-(--slate) bg-white text-sm font-semibold text-left hover:border-(--primary)">
                        <span className="text-(--primary-deep)" aria-hidden>{s.icon}</span>{s.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ol className="space-y-4">
              {list.map((m, i) => {
                const showDay = i === 0 || dayLabel(list[i - 1].createdAt) !== dayLabel(m.createdAt);
                return (
                  <li key={i}>
                    {showDay && (
                      <div className="flex items-center gap-3 my-2 text-[11px] font-semibold text-(--ink-soft)" aria-hidden>
                        <span className="flex-1 border-t border-(--slate)" />{dayLabel(m.createdAt)}<span className="flex-1 border-t border-(--slate)" />
                      </div>
                    )}
                    <ChatMessage role={m.role} content={m.content} />
                  </li>
                );
              })}
              {streaming !== null && (
                <li><ChatMessage role="assistant" content={streaming} streaming /></li>
              )}
              {sending && streaming === null && (
                <li><ChatMessage role="assistant" content="" streaming /></li>
              )}
            </ol>
          )}

          {failed && (
            <div role="alert" className="mt-4 rounded-xl border border-(--coral) bg-(--coral-soft) p-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm flex-1 flex items-center gap-2"><AlertTriangle size={16} className="text-(--coral) shrink-0" aria-hidden /> Ask Msingi couldn&apos;t reply. Check your connection and try again.</p>
              <Button size="sm" variant="secondary" onClick={retry}><RotateCcw size={14} aria-hidden /> Try again</Button>
            </div>
          )}
          {limitReached && (
            <div role="alert" className="mt-4 rounded-xl border border-(--gold-deep) bg-(--amber-soft) p-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm flex-1 flex items-center gap-2"><Crown size={16} className="text-(--gold-deep) shrink-0" aria-hidden />{limitReached}</p>
              <Button size="sm" variant="gold" href="/upgrade">Upgrade</Button>
            </div>
          )}
        </div>

        <p className="sr-only" aria-live="polite">{announcement}</p>

        {/* Composer */}
        {(messages.status === "ready") && (
          <div className="pt-3 border-t border-(--slate)">
            {list.length > 0 && !sending && !input && (
              <div className="flex gap-2 overflow-x-auto sm:flex-wrap pb-2.5 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Suggested follow-ups">
                {FOLLOW_UPS.map((f) => (
                  <button key={f} type="button" onClick={() => applySuggestion(f)}
                    className="tap shrink-0 min-h-9 px-3 rounded-full border border-(--slate) bg-white text-xs font-semibold text-(--ink-soft) hover:border-(--primary) hover:text-(--ink)">
                    {f}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2">
              <label htmlFor="ask-input" className="sr-only">Message Ask Msingi</label>
              <textarea id="ask-input" ref={inputRef} rows={1} value={input} maxLength={MAX_LEN}
                onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown}
                placeholder="Ask Msingi a question…" aria-describedby="ask-hint"
                className="flex-1 resize-none bg-white border border-(--slate) rounded-2xl px-4 py-3 text-base leading-6 outline-none" />
              <Button type="submit" size="lg" disabled={sending || !input.trim()} className="w-12 px-0! shrink-0" aria-label={sending ? "Ask Msingi is replying" : "Send message"}>
                <ArrowUp size={20} aria-hidden />
              </Button>
            </form>
            <p id="ask-hint" className="text-[11px] text-(--ink-soft) mt-1.5 flex justify-between gap-3">
              <span>Msingi can make mistakes — check important facts against your lessons.</span>
              <span className="hidden sm:inline shrink-0">Enter to send · Shift+Enter for a new line</span>
            </p>
          </div>
        )}
      </div>
    </Shell>
  );
}

// The tutor is told to write plain text, but the model sometimes still wraps
// words in **bold**. Render just that as <strong> (React elements only — no
// HTML injection); everything else stays exactly as written.
function TutorText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*\n]+\*\*)/g);
  return <>{parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") && p.length > 4 ? <strong key={i}>{p.slice(2, -2)}</strong> : p))}</>;
}

function ChatMessage({ role, content, streaming = false }: { role: "user" | "assistant"; content: string; streaming?: boolean }) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <span className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${isUser ? "bg-(--green) text-white" : "bg-white border border-(--slate)"}`} aria-hidden>
        {isUser ? <User size={16} /> : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logo-icon-sm.png" alt="" className="w-6 h-6 object-contain" />
        )}
      </span>
      <div className={`min-w-0 max-w-[85%] sm:max-w-[75%] ${isUser ? "items-end text-right" : ""} flex flex-col`}>
        <span className="text-[11px] font-semibold text-(--ink-soft) mb-1 px-1">{isUser ? "You" : "Ask Msingi"}</span>
        <div className={`rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words text-left ${isUser ? "bg-(--primary-soft) text-(--ink) rounded-tr-md" : "bg-white border border-(--slate) rounded-tl-md"}`}>
          {content ? <TutorText text={content} /> : (streaming ? <span className="text-(--ink-soft) inline-flex items-center gap-2">Thinking<span className="ai-dots" aria-hidden><i /><i /><i /></span></span> : null)}
          {streaming && content && <span className="ai-caret" aria-hidden />}
        </div>
      </div>
    </div>
  );
}

export default function AiPage() {
  return <Suspense><AiInner /></Suspense>;
}
