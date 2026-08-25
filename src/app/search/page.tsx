"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Search as SearchIcon, BookOpen, Layers, Library, ClipboardCheck } from "lucide-react";

type Results = {
  lessons: { id: string; title: string }[];
  topics: { id: string; name: string }[];
  resources: { id: string; title: string; type: string }[];
  flashcards: { topicName: string; front: string }[];
  tests: { id: string; title: string }[];
};

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const [input, setInput] = useState(q);
  const [results, setResults] = useState<Results | null>(null);

  useEffect(() => {
    if (!q) return;
    fetch(`/api/search?q=${encodeURIComponent(q)}`).then((r) => r.json()).then(setResults);
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(input)}`);
  }

  const hasAny = results && (results.lessons.length || results.topics.length || results.resources.length || results.flashcards.length || results.tests.length);

  return (
    <Shell>
      <div className="fade-in max-w-2xl mx-auto space-y-6">
        <form onSubmit={submit} className="flex items-center gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search lessons, topics, resources, flashcards, tests…"
            className="flex-1 border rounded-full px-4 py-2.5 text-sm outline-none" style={{ borderColor: "var(--slate)" }} />
          <button type="submit" className="tap w-11 h-11 rounded-full flex items-center justify-center text-white" style={{ background: "var(--ink)" }}><SearchIcon size={16} /></button>
        </form>

        {!q ? (
          <p className="text-sm text-[--ink-soft] text-center py-10">Search across Msingi&apos;s lessons, topics, library resources, flashcards, and tests.</p>
        ) : !results ? (
          <p className="text-sm text-[--ink-soft]">Searching…</p>
        ) : !hasAny ? (
          <p className="text-sm text-[--ink-soft] text-center py-10">No results for &quot;{q}&quot;.</p>
        ) : (
          <div className="space-y-5">
            {results.topics.length > 0 && (
              <section>
                <h3 className="text-xs font-bold text-[--ink-soft] uppercase mb-2 flex items-center gap-1"><Layers size={12} /> Topics</h3>
                <div className="space-y-1.5">
                  {results.topics.map((t) => (
                    <Link key={t.id} href={`/practice?topic=${encodeURIComponent(t.name)}`} className="tap block bg-white rounded-xl px-4 py-2.5 text-sm border" style={{ borderColor: "var(--slate)" }}>{t.name}</Link>
                  ))}
                </div>
              </section>
            )}
            {results.lessons.length > 0 && (
              <section>
                <h3 className="text-xs font-bold text-[--ink-soft] uppercase mb-2 flex items-center gap-1"><BookOpen size={12} /> Lessons</h3>
                <div className="space-y-1.5">
                  {results.lessons.map((l) => (
                    <Link key={l.id} href={`/learn/lesson/${l.id}`} className="tap block bg-white rounded-xl px-4 py-2.5 text-sm border" style={{ borderColor: "var(--slate)" }}>{l.title}</Link>
                  ))}
                </div>
              </section>
            )}
            {results.tests.length > 0 && (
              <section>
                <h3 className="text-xs font-bold text-[--ink-soft] uppercase mb-2 flex items-center gap-1"><ClipboardCheck size={12} /> Tests</h3>
                <div className="space-y-1.5">
                  {results.tests.map((t) => (
                    <Link key={t.id} href={`/tests/${t.id}`} className="tap block bg-white rounded-xl px-4 py-2.5 text-sm border" style={{ borderColor: "var(--slate)" }}>{t.title}</Link>
                  ))}
                </div>
              </section>
            )}
            {results.resources.length > 0 && (
              <section>
                <h3 className="text-xs font-bold text-[--ink-soft] uppercase mb-2 flex items-center gap-1"><Library size={12} /> Library</h3>
                <div className="space-y-1.5">
                  {results.resources.map((r) => (
                    <Link key={r.id} href="/library" className="tap block bg-white rounded-xl px-4 py-2.5 text-sm border" style={{ borderColor: "var(--slate)" }}>{r.title} <span className="text-xs text-[--ink-soft]">({r.type})</span></Link>
                  ))}
                </div>
              </section>
            )}
            {results.flashcards.length > 0 && (
              <section>
                <h3 className="text-xs font-bold text-[--ink-soft] uppercase mb-2">Flashcards</h3>
                <div className="space-y-1.5">
                  {results.flashcards.map((f, i) => (
                    <Link key={i} href={`/flashcards?topic=${encodeURIComponent(f.topicName)}`} className="tap block bg-white rounded-xl px-4 py-2.5 text-sm border" style={{ borderColor: "var(--slate)" }}>{f.front}</Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}

export default function SearchPage() {
  return <Suspense><SearchInner /></Suspense>;
}
