"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { Pill } from "@/components/ui";
import { Library, Bookmark, FileText, X } from "lucide-react";

type Resource = {
  id: string; title: string; type: string; difficulty: string | null;
  fileUrl: string | null; bodyText: string | null; bookmarked: boolean;
};

const TYPES = ["notes", "worksheet", "past_paper", "marking_scheme", "video", "summary", "flashcard_set"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const TYPE_LABEL: Record<string, string> = {
  notes: "Notes", worksheet: "Worksheet", past_paper: "Past Paper", marking_scheme: "Marking Scheme",
  video: "Video", summary: "Summary", flashcard_set: "Flashcard Set",
};

export default function LibraryPage() {
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [type, setType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [reading, setReading] = useState<Resource | null>(null);

  const load = () => {
    const qs = new URLSearchParams();
    if (type) qs.set("type", type);
    if (difficulty) qs.set("difficulty", difficulty);
    if (bookmarkedOnly) qs.set("bookmarkedOnly", "1");
    fetch(`/api/resources?${qs.toString()}`).then((r) => r.json()).then((d) => setResources(d.resources));
  };

  useEffect(load, [type, difficulty, bookmarkedOnly]);

  async function toggleBookmark(r: Resource) {
    await fetch(`/api/resources/${r.id}/bookmark`, { method: r.bookmarked ? "DELETE" : "POST" });
    setResources((rs) => rs?.map((x) => (x.id === r.id ? { ...x, bookmarked: !x.bookmarked } : x)) ?? null);
  }

  const filterSelect = (value: string, onChange: (v: string) => void, options: string[], placeholder: string, labels?: Record<string, string>) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{labels?.[o] ?? o}</option>)}
    </select>
  );

  return (
    <Shell>
      <div className="fade-in space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="disp text-3xl font-bold flex items-center gap-2"><Library size={22} className="text-[--primary]" /> Msingi Library</h1>
            <p className="text-sm text-[--ink-soft] mt-1">Revision notes, worksheets, summaries and more.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {filterSelect(type, setType, TYPES, "All types", TYPE_LABEL)}
            {filterSelect(difficulty, setDifficulty, DIFFICULTIES, "All difficulties")}
            <button onClick={() => setBookmarkedOnly((b) => !b)}
              className={`tap flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border ${bookmarkedOnly ? "text-white" : ""}`}
              style={{ borderColor: "var(--primary)", background: bookmarkedOnly ? "var(--primary)" : "white" }}>
              <Bookmark size={14} /> Bookmarked
            </button>
          </div>
        </div>

        {!resources ? (
          <p className="text-sm text-[--ink-soft]">Loading library…</p>
        ) : resources.length === 0 ? (
          <div className="text-center py-20 max-w-sm mx-auto">
            <FileText size={36} className="mx-auto text-[--ink-soft] mb-3" />
            <h2 className="disp text-xl font-bold mb-1">No resources found</h2>
            <p className="text-sm text-[--ink-soft]">Try a different filter, or check back later.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {resources.map((r) => (
              <div key={r.id} className="brick bg-white rounded-2xl p-5 border flex flex-col" style={{ borderColor: "var(--slate)" }}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Pill tone="gold">{TYPE_LABEL[r.type] ?? r.type}</Pill>
                  <button onClick={() => toggleBookmark(r)} title="Bookmark" className="tap">
                    <Bookmark size={16} fill={r.bookmarked ? "var(--primary)" : "none"} color="var(--primary)" />
                  </button>
                </div>
                <div className="font-semibold text-sm mb-1">{r.title}</div>
                {r.difficulty && <div className="text-xs text-[--ink-soft] mb-3 capitalize">{r.difficulty}</div>}
                <div className="mt-auto pt-2">
                  {r.bodyText ? (
                    <button onClick={() => setReading(r)} className="tap text-xs font-semibold text-[--primary]">Read →</button>
                  ) : r.fileUrl ? (
                    <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="tap text-xs font-semibold text-[--primary]">Open file →</a>
                  ) : (
                    <span className="text-xs text-[--ink-soft]">No content yet</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reading && (
        <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setReading(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <h2 className="disp text-xl font-bold pr-4">{reading.title}</h2>
              <button onClick={() => setReading(null)} className="tap"><X size={20} /></button>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{reading.bodyText}</p>
          </div>
        </div>
      )}
    </Shell>
  );
}
