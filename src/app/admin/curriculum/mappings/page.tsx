"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Pill, Button, Card, ErrorState, EmptyState, LoadingState, Skeleton, type Tone } from "@/components/ui";
import { MATCH_STATUSES, MATCH_STATUS_LABEL, MATCH_STATUS_HELP, STATUSES_FORBIDDING_TARGET, type MatchStatus } from "@/lib/curriculum-review";
import { ArrowLeft, GitCompare } from "lucide-react";

type Mapping = {
  id: string;
  msingi: { kind: "subject" | "strand" | "sub_strand" | "topic" | null; id: string; path: string[]; learnerImpact: Record<string, number> };
  official: {
    grade: string | null; subject: string | null; subjectStatus: string | null; strand: string | null; subStrand: string | null;
    suggestedLessons: number | null; sourcePage: string | null;
    source: { title: string | null; isbn: string | null; revision: string | null; access: string | null; isDraft: boolean | null } | null;
  } | null;
  officialIds: { subjectId: string | null; strandId: string | null; subStrandId: string | null };
  matchStatus: MatchStatus; notes: string | null; reviewedAt: string | null; reviewedBy: string | null;
};
type Candidate = { subjectId: string; grade: string | null; subjectCode: string; subjectName: string; strands: { id: string; number: string; name: string; subStrands: { id: string; number: string; name: string }[] }[] };
type Data = { summary: Record<MatchStatus, number>; total: number; unreviewed: number; mappings: Mapping[]; candidates: Candidate[] };

const TONE: Record<MatchStatus, Tone> = { exact: "green", probable: "blue", needs_review: "warning", no_match: "coral", supplementary: "gold" };
const KIND_LABEL = { subject: "Subject", strand: "Strand", sub_strand: "Sub-strand", topic: "Topic" } as const;
const IMPACT_LABEL: Record<string, [string, string]> = {
  learnerProgressRows: ["learner progress record", "learner progress records"], learnerSubjectProgress: ["learner progress record", "learner progress records"],
  mistakes: ["recorded mistake", "recorded mistakes"], questions: ["question", "questions"], lessons: ["lesson", "lessons"],
  tests: ["test", "tests"], topics: ["topic", "topics"],
};

function impactText(impact: Record<string, number>) {
  const parts = Object.entries(impact).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${IMPACT_LABEL[k]?.[n === 1 ? 0 : 1] ?? k}`);
  return parts.length ? parts.join(" · ") : "No learner activity or content attached";
}

export default function CurriculumMappingsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<MatchStatus | "unreviewed" | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/curriculum-mappings")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: Data) => { setData(d); setError(false); })
      .catch(() => setError(true));
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.mappings;
    if (filter === "unreviewed") return data.mappings.filter((m) => !m.reviewedAt);
    return data.mappings.filter((m) => m.matchStatus === filter);
  }, [data, filter]);

  return (
    <AdminShell title="Curriculum review">
      <Link href="/admin/curriculum" className="tap inline-flex items-center gap-1 text-sm font-medium text-(--ink-soft) mb-3"><ArrowLeft size={14} aria-hidden /> Curriculum</Link>
      <p className="text-sm text-(--ink-soft) max-w-3xl mb-1">
        How existing Msingi content lines up with the official KICD structure. Your decisions here only change the link:
        no topic, lesson, question or learner record is moved, renamed or deleted.
      </p>
      <p className="text-xs text-(--ink-soft) max-w-3xl mb-5">
        Only official numbering, headings and suggested lesson counts are shown. If something can&apos;t be confirmed from the official design, leave it as &ldquo;Needs review&rdquo;.
      </p>

      {error ? (
        <Card><ErrorState title="We couldn't load the mappings" onRetry={() => { setError(false); load(); }} /></Card>
      ) : !data ? (
        <LoadingState label="Loading mappings"><div className="space-y-3"><Skeleton className="h-9 w-2/3" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div></LoadingState>
      ) : data.total === 0 ? (
        <Card><EmptyState icon={<GitCompare size={22} />} title="No mappings yet" description="Run the curriculum import to create the first mappings." /></Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filter by status">
            {([["all", `All (${data.total})`], ["unreviewed", `Not yet reviewed (${data.unreviewed})`], ...MATCH_STATUSES.map((s) => [s, `${MATCH_STATUS_LABEL[s]} (${data.summary[s] ?? 0})`] as const)] as const).map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key as typeof filter)} aria-pressed={filter === key}
                className="tap px-3 py-1.5 rounded-full border text-xs font-semibold"
                style={{ borderColor: filter === key ? "var(--primary)" : "var(--slate)", background: filter === key ? "var(--primary)" : "white", color: filter === key ? "white" : "var(--ink)" }}>
                {label}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <Card><EmptyState compact title="Nothing in this view" description="No mappings match this filter." /></Card>
          ) : (
            <ul className="space-y-3">
              {shown.map((m) => (
                <li key={m.id}>
                  <Card padding="none">
                    <div className="grid gap-4 p-4 md:grid-cols-[1.2fr_1.2fr_auto] md:items-start">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-(--ink-soft)">Msingi {m.msingi.kind ? KIND_LABEL[m.msingi.kind].toLowerCase() : "content"}</div>
                        <div className="font-semibold break-words">{m.msingi.path[m.msingi.path.length - 1] ?? "(missing)"}</div>
                        <div className="text-xs text-(--ink-soft) break-words">{m.msingi.path.slice(0, -1).join(" › ")}</div>
                        <div className="text-xs mt-1.5 text-(--ink-soft)">{impactText(m.msingi.learnerImpact)}</div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-(--ink-soft)">Official candidate</div>
                        {m.official ? (
                          <>
                            <div className="font-semibold break-words">{m.official.subStrand ?? m.official.strand ?? m.official.subject}</div>
                            <div className="text-xs text-(--ink-soft) break-words">
                              {[m.official.grade, m.official.subject, m.official.subStrand && m.official.strand ? `Strand ${m.official.strand}` : null].filter(Boolean).join(" · ")}
                              {m.official.suggestedLessons ? ` · ${m.official.suggestedLessons} suggested lessons` : ""}
                            </div>
                            {m.official.source && (
                              <div className="text-xs mt-1.5 text-(--ink-soft) break-words">
                                Source: {m.official.source.title ?? "KICD design"}
                                {m.official.source.isbn ? ` · ISBN ${m.official.source.isbn}` : ""}
                                {m.official.source.revision ? ` · ${m.official.source.revision}` : ""}
                                {m.official.sourcePage ? ` · p. ${m.official.sourcePage}` : ""}
                                {m.official.source.access ? ` · ${m.official.source.access}` : ""}
                                {m.official.source.isDraft ? " · draft" : ""}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-(--ink-soft)">None identified</div>
                        )}
                      </div>

                      <div className="flex md:flex-col items-start md:items-end gap-2">
                        <Pill tone={TONE[m.matchStatus]}>{MATCH_STATUS_LABEL[m.matchStatus]}</Pill>
                        <Button size="sm" variant="secondary" onClick={() => setEditingId(editingId === m.id ? null : m.id)} aria-expanded={editingId === m.id}>
                          {editingId === m.id ? "Close" : m.reviewedAt ? "Edit review" : "Review"}
                        </Button>
                      </div>
                    </div>

                    <div className="px-4 pb-3 text-xs text-(--ink-soft) border-t border-(--stone-2) pt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                      <span><b className="text-(--ink)">Reason:</b> {m.notes ?? "—"}</span>
                      <span>{m.reviewedAt ? `Reviewed${m.reviewedBy ? ` by ${m.reviewedBy}` : ""} on ${new Date(m.reviewedAt).toLocaleDateString()}` : "Not yet reviewed (automatic classification)"}</span>
                    </div>

                    {editingId === m.id && (
                      <Editor mapping={m} candidates={data.candidates} onDone={(saved) => { setEditingId(null); if (saved) load(); }} />
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </AdminShell>
  );
}

function Editor({ mapping, candidates, onDone }: { mapping: Mapping; candidates: Candidate[]; onDone: (saved: boolean) => void }) {
  const kind = mapping.msingi.kind;
  const [status, setStatus] = useState<MatchStatus>(mapping.matchStatus);
  const ids = mapping.officialIds;
  // Start from the mapping's current official location (by id, never by display text).
  const [target, setTarget] = useState(ids.subStrandId ? `ss:${ids.subStrandId}` : ids.strandId ? `st:${ids.strandId}` : ids.subjectId && kind === "subject" ? `su:${ids.subjectId}` : "");
  const [notes, setNotes] = useState(mapping.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const forbids = STATUSES_FORBIDDING_TARGET.includes(status);

  async function save() {
    setSaving(true); setErr(null);
    const [type, id] = forbids || !target ? [null, null] : target.split(":");
    const res = await fetch(`/api/admin/curriculum-mappings/${mapping.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchStatus: status,
        curriculumSubjectId: type === "su" ? id : null,
        curriculumStrandId: type === "st" ? id : null,
        curriculumSubStrandId: type === "ss" ? id : null,
        notes: notes.trim() || null,
      }),
    }).catch(() => null);
    setSaving(false);
    if (!res) return setErr("Couldn't reach the server. Check your connection and try again.");
    if (!res.ok) { const b = await res.json().catch(() => ({})); return setErr(typeof b.error === "string" ? b.error : "That couldn't be saved."); }
    onDone(true);
  }

  return (
    <div className="border-t border-(--stone-2) p-4 bg-(--stone-1,#f8fafc) space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold">Decision</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as MatchStatus)} className="mt-1 w-full border rounded-xl px-3 py-2 bg-white" style={{ borderColor: "var(--slate)" }}>
            {MATCH_STATUSES.map((s) => <option key={s} value={s}>{MATCH_STATUS_LABEL[s]}</option>)}
          </select>
          <span className="block text-xs text-(--ink-soft) mt-1">{MATCH_STATUS_HELP[status]}</span>
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Official location</span>
          <select value={forbids ? "" : target} disabled={forbids} onChange={(e) => setTarget(e.target.value)} className="mt-1 w-full border rounded-xl px-3 py-2 bg-white disabled:opacity-50" style={{ borderColor: "var(--slate)" }}>
            <option value="">{forbids ? "None (not applicable)" : "— none chosen —"}</option>
            {candidates.map((c) => (
              <optgroup key={c.subjectId} label={`${c.grade ?? ""} ${c.subjectName}`.trim()}>
                {kind === "subject" ? (
                  <option value={`su:${c.subjectId}`}>{c.subjectName} (learning area)</option>
                ) : c.strands.flatMap((st) => [
                  <option key={st.id} value={`st:${st.id}`}>{st.number} {st.name} (strand)</option>,
                  ...st.subStrands.map((s) => <option key={s.id} value={`ss:${s.id}`}>&nbsp;&nbsp;{s.number} {s.name}</option>),
                ])}
              </optgroup>
            ))}
          </select>
          <span className="block text-xs text-(--ink-soft) mt-1">{forbids ? "This decision means there is no official location." : "Only the imported pilot structure can be chosen."}</span>
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-semibold">Reason</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={2} className="mt-1 w-full border rounded-xl px-3 py-2 bg-white" style={{ borderColor: "var(--slate)" }}
          placeholder="Why this decision? e.g. what you checked in the official design" />
      </label>
      {err && <p role="alert" className="text-sm text-(--coral)">{err}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save decision"}</Button>
        <Button size="sm" variant="ghost" onClick={() => onDone(false)} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
}
