import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  curriculumMappings, curriculumSubjects, curriculumStrands, curriculumSubStrands, curriculumVersions, sourceDocuments, grades,
  subjects, strands, subStrands, topics, profiles, topicProgress, mistakes, questions, lessons, subjectProgress, tests,
} from "@/db/schema";
import { STATUSES_FORBIDDING_TARGET, STATUSES_REQUIRING_TARGET, type MatchStatus, type MappingKind } from "@/lib/curriculum-review";

export type ReviewInput = {
  matchStatus: MatchStatus;
  curriculumSubjectId?: string | null;
  curriculumStrandId?: string | null;
  curriculumSubStrandId?: string | null;
  notes?: string | null;
};
export type ReviewResult =
  | { ok: true; mapping: typeof curriculumMappings.$inferSelect }
  | { ok: false; status: 400 | 404; error: string };

const fail = (status: 400 | 404, error: string): ReviewResult => ({ ok: false, status, error });

/**
 * Records an admin's decision about one mapping. It changes ONLY that
 * curriculum_mappings row: no Msingi content, topic, lesson, question or
 * learner record is moved, renamed or deleted. Official targets are resolved
 * from the most specific id given, and must belong to the mapping's own
 * curriculum version, so a mapping can't point at another version's structure.
 */
export async function reviewMapping(mappingId: string, reviewerId: string, input: ReviewInput): Promise<ReviewResult> {
  return db.transaction(async (tx) => {
    const [m] = await tx.select().from(curriculumMappings).where(eq(curriculumMappings.id, mappingId)).for("update").limit(1);
    if (!m) return fail(404, "Mapping not found.");
    const kind = m.topicId ? "topic" : m.subStrandId ? "sub_strand" : m.strandId ? "strand" : "subject";

    // Resolve the official target from the deepest id supplied and check the others agree.
    let target = { subject: null as string | null, strand: null as string | null, subStrand: null as string | null };
    if (input.curriculumSubStrandId) {
      const [r] = await tx.select({ ss: curriculumSubStrands.id, st: curriculumStrands.id, su: curriculumSubjects.id, v: curriculumSubjects.versionId })
        .from(curriculumSubStrands).innerJoin(curriculumStrands, eq(curriculumStrands.id, curriculumSubStrands.strandId))
        .innerJoin(curriculumSubjects, eq(curriculumSubjects.id, curriculumStrands.curriculumSubjectId))
        .where(eq(curriculumSubStrands.id, input.curriculumSubStrandId)).limit(1);
      if (!r) return fail(400, "Unknown official sub-strand.");
      if (r.v !== m.versionId) return fail(400, "That official sub-strand belongs to a different curriculum version.");
      if (input.curriculumStrandId && input.curriculumStrandId !== r.st) return fail(400, "The strand doesn't contain that sub-strand.");
      if (input.curriculumSubjectId && input.curriculumSubjectId !== r.su) return fail(400, "The subject doesn't contain that sub-strand.");
      target = { subject: r.su, strand: r.st, subStrand: r.ss };
    } else if (input.curriculumStrandId) {
      const [r] = await tx.select({ st: curriculumStrands.id, su: curriculumSubjects.id, v: curriculumSubjects.versionId })
        .from(curriculumStrands).innerJoin(curriculumSubjects, eq(curriculumSubjects.id, curriculumStrands.curriculumSubjectId))
        .where(eq(curriculumStrands.id, input.curriculumStrandId)).limit(1);
      if (!r) return fail(400, "Unknown official strand.");
      if (r.v !== m.versionId) return fail(400, "That official strand belongs to a different curriculum version.");
      if (input.curriculumSubjectId && input.curriculumSubjectId !== r.su) return fail(400, "The subject doesn't contain that strand.");
      target = { subject: r.su, strand: r.st, subStrand: null };
    } else if (input.curriculumSubjectId) {
      const [r] = await tx.select({ su: curriculumSubjects.id, v: curriculumSubjects.versionId }).from(curriculumSubjects)
        .where(and(eq(curriculumSubjects.id, input.curriculumSubjectId))).limit(1);
      if (!r) return fail(400, "Unknown official subject.");
      if (r.v !== m.versionId) return fail(400, "That official subject belongs to a different curriculum version.");
      target = { subject: r.su, strand: null, subStrand: null };
    }
    const hasTarget = !!target.subject;

    if (STATUSES_REQUIRING_TARGET.includes(input.matchStatus) && !hasTarget) return fail(400, "An exact or probable match must name the official location.");
    if (STATUSES_FORBIDDING_TARGET.includes(input.matchStatus) && hasTarget) return fail(400, "\"No official match\" and \"supplementary\" can't point at an official location. Clear it first.");
    if (kind === "subject" && (target.strand || target.subStrand)) return fail(400, "A subject maps to an official learning area, not to a strand.");
    if (kind !== "subject" && hasTarget && !target.strand) return fail(400, "Pick an official strand or sub-strand.");

    const [updated] = await tx.update(curriculumMappings).set({
      matchStatus: input.matchStatus,
      curriculumSubjectId: target.subject, curriculumStrandId: target.strand, curriculumSubStrandId: target.subStrand,
      notes: input.notes === undefined ? m.notes : (input.notes?.trim() || null),
      reviewedBy: reviewerId, reviewedAt: new Date(), updatedAt: new Date(),
    }).where(eq(curriculumMappings.id, mappingId)).returning();
    return { ok: true as const, mapping: updated };
  });
}

/**
 * Every mapping between Msingi content and the official structure, with the
 * evidence an admin needs: where the Msingi content sits, the official
 * candidate and its source document, and how much learner data hangs off it.
 * Read-only; structure and numbering only (no KICD text).
 */
export async function listMappingsForReview() {
  const rows = await db.select({
    m: curriculumMappings,
    versionCode: curriculumVersions.code,
    reviewerName: profiles.name,
  }).from(curriculumMappings)
    .innerJoin(curriculumVersions, eq(curriculumVersions.id, curriculumMappings.versionId))
    .leftJoin(profiles, eq(profiles.userId, curriculumMappings.reviewedBy));

  const ids = (pick: (m: (typeof rows)[number]["m"]) => string | null) => rows.map((r) => pick(r.m)).filter((x): x is string => !!x);
  const subjectIds = ids((m) => m.subjectId), strandIds = ids((m) => m.strandId), subStrandIds = ids((m) => m.subStrandId), topicIds = ids((m) => m.topicId);

  // Where each piece of Msingi content sits (display names only; identity is the id).
  const place = new Map<string, { kind: MappingKind; path: string[]; impact: Record<string, number> }>();
  if (subjectIds.length) {
    const r = await db.select({ id: subjects.id, g: grades.name, s: subjects.name }).from(subjects)
      .innerJoin(grades, eq(grades.id, subjects.gradeId)).where(inArray(subjects.id, subjectIds));
    const sp = await db.select({ id: subjectProgress.subjectId, n: count() }).from(subjectProgress).where(inArray(subjectProgress.subjectId, subjectIds)).groupBy(subjectProgress.subjectId);
    const ts = await db.select({ id: tests.subjectId, n: count() }).from(tests).where(inArray(tests.subjectId, subjectIds)).groupBy(tests.subjectId);
    for (const x of r) place.set(`subject:${x.id}`, { kind: "subject", path: [x.g, x.s], impact: { learnerSubjectProgress: sp.find((y) => y.id === x.id)?.n ?? 0, tests: ts.find((y) => y.id === x.id)?.n ?? 0 } });
  }
  if (strandIds.length) {
    const r = await db.select({ id: strands.id, g: grades.name, s: subjects.name, st: strands.name }).from(strands)
      .innerJoin(subjects, eq(subjects.id, strands.subjectId)).innerJoin(grades, eq(grades.id, subjects.gradeId)).where(inArray(strands.id, strandIds));
    const tc = await db.select({ id: strands.id, n: count(topics.id) }).from(strands)
      .innerJoin(subStrands, eq(subStrands.strandId, strands.id)).innerJoin(topics, eq(topics.subStrandId, subStrands.id))
      .where(inArray(strands.id, strandIds)).groupBy(strands.id);
    for (const x of r) place.set(`strand:${x.id}`, { kind: "strand", path: [x.g, x.s, x.st], impact: { topics: tc.find((y) => y.id === x.id)?.n ?? 0 } });
  }
  if (subStrandIds.length) {
    const r = await db.select({ id: subStrands.id, g: grades.name, s: subjects.name, st: strands.name, ss: subStrands.name }).from(subStrands)
      .innerJoin(strands, eq(strands.id, subStrands.strandId)).innerJoin(subjects, eq(subjects.id, strands.subjectId)).innerJoin(grades, eq(grades.id, subjects.gradeId))
      .where(inArray(subStrands.id, subStrandIds));
    const tc = await db.select({ id: topics.subStrandId, n: count() }).from(topics).where(inArray(topics.subStrandId, subStrandIds)).groupBy(topics.subStrandId);
    for (const x of r) place.set(`sub_strand:${x.id}`, { kind: "sub_strand", path: [x.g, x.s, x.st, x.ss], impact: { topics: tc.find((y) => y.id === x.id)?.n ?? 0 } });
  }
  if (topicIds.length) {
    const r = await db.select({ id: topics.id, g: grades.name, s: subjects.name, st: strands.name, ss: subStrands.name, t: topics.name }).from(topics)
      .innerJoin(subStrands, eq(subStrands.id, topics.subStrandId)).innerJoin(strands, eq(strands.id, subStrands.strandId))
      .innerJoin(subjects, eq(subjects.id, strands.subjectId)).innerJoin(grades, eq(grades.id, subjects.gradeId)).where(inArray(topics.id, topicIds));
    const by = async <T extends { id: string; n: number }>(q: Promise<T[]>) => new Map((await q).map((x) => [x.id, x.n]));
    const [prog, mist, qs, les] = await Promise.all([
      by(db.select({ id: topicProgress.topicId, n: count() }).from(topicProgress).where(inArray(topicProgress.topicId, topicIds)).groupBy(topicProgress.topicId)),
      by(db.select({ id: mistakes.topicId, n: count() }).from(mistakes).where(inArray(mistakes.topicId, topicIds)).groupBy(mistakes.topicId)),
      by(db.select({ id: questions.topicId, n: count() }).from(questions).where(inArray(questions.topicId, topicIds)).groupBy(questions.topicId)),
      by(db.select({ id: lessons.topicId, n: count() }).from(lessons).where(inArray(lessons.topicId, topicIds)).groupBy(lessons.topicId)),
    ]);
    for (const x of r) place.set(`topic:${x.id}`, { kind: "topic", path: [x.g, x.s, x.st, x.ss, x.t], impact: {
      learnerProgressRows: prog.get(x.id) ?? 0, mistakes: mist.get(x.id) ?? 0, questions: qs.get(x.id) ?? 0, lessons: les.get(x.id) ?? 0,
    } });
  }

  // Official candidates, with their source documents.
  const offIds = {
    subject: ids((m) => m.curriculumSubjectId), strand: ids((m) => m.curriculumStrandId), sub: ids((m) => m.curriculumSubStrandId),
  };
  const [oSub, oStr, oSS] = await Promise.all([
    offIds.subject.length ? db.select({ id: curriculumSubjects.id, code: curriculumSubjects.code, name: curriculumSubjects.name, grade: grades.code, status: curriculumSubjects.status,
        docTitle: sourceDocuments.officialTitle, isbn: sourceDocuments.isbn, revision: sourceDocuments.revisionLabel, access: sourceDocuments.accessStatus, isDraft: sourceDocuments.isDraft })
      .from(curriculumSubjects).innerJoin(grades, eq(grades.id, curriculumSubjects.gradeId)).leftJoin(sourceDocuments, eq(sourceDocuments.id, curriculumSubjects.sourceDocumentId))
      .where(inArray(curriculumSubjects.id, offIds.subject)) : [],
    offIds.strand.length ? db.select({ id: curriculumStrands.id, number: curriculumStrands.number, name: curriculumStrands.name, page: curriculumStrands.sourcePage }).from(curriculumStrands).where(inArray(curriculumStrands.id, offIds.strand)) : [],
    offIds.sub.length ? db.select({ id: curriculumSubStrands.id, number: curriculumSubStrands.number, name: curriculumSubStrands.name, lessons: curriculumSubStrands.suggestedLessons, page: curriculumSubStrands.sourcePage }).from(curriculumSubStrands).where(inArray(curriculumSubStrands.id, offIds.sub)) : [],
  ]);

  // Everything an admin can pick as a candidate: the official structure that has been imported.
  const pickable = await db.select({
    subjectId: curriculumSubjects.id, grade: grades.code, subjectCode: curriculumSubjects.code, subjectName: curriculumSubjects.name,
    strandId: curriculumStrands.id, strandNumber: curriculumStrands.number, strandName: curriculumStrands.name,
    subStrandId: curriculumSubStrands.id, subStrandNumber: curriculumSubStrands.number, subStrandName: curriculumSubStrands.name,
  }).from(curriculumSubjects)
    .innerJoin(grades, eq(grades.id, curriculumSubjects.gradeId))
    .innerJoin(curriculumStrands, eq(curriculumStrands.curriculumSubjectId, curriculumSubjects.id))
    .leftJoin(curriculumSubStrands, eq(curriculumSubStrands.strandId, curriculumStrands.id))
    .orderBy(asc(grades.order), asc(curriculumSubjects.sortOrder), asc(curriculumStrands.sortOrder), asc(curriculumSubStrands.sortOrder));
  const candidates = new Map<string, { subjectId: string; grade: string | null; subjectCode: string; subjectName: string; strands: Map<string, { id: string; number: string; name: string; subStrands: { id: string; number: string; name: string }[] }> }>();
  for (const p of pickable) {
    const c = candidates.get(p.subjectId) ?? { subjectId: p.subjectId, grade: p.grade, subjectCode: p.subjectCode, subjectName: p.subjectName, strands: new Map() };
    candidates.set(p.subjectId, c);
    const st = c.strands.get(p.strandId) ?? { id: p.strandId, number: p.strandNumber, name: p.strandName, subStrands: [] };
    c.strands.set(p.strandId, st);
    if (p.subStrandId) st.subStrands.push({ id: p.subStrandId, number: p.subStrandNumber!, name: p.subStrandName! });
  }

  const mappings = rows.map(({ m, versionCode, reviewerName }) => {
    const msingiKey = m.topicId ? `topic:${m.topicId}` : m.subStrandId ? `sub_strand:${m.subStrandId}` : m.strandId ? `strand:${m.strandId}` : `subject:${m.subjectId}`;
    const p = place.get(msingiKey);
    const subj = oSub.find((x) => x.id === m.curriculumSubjectId);
    const str = oStr.find((x) => x.id === m.curriculumStrandId);
    const ss = oSS.find((x) => x.id === m.curriculumSubStrandId);
    return {
      id: m.id, version: versionCode,
      msingi: { kind: p?.kind ?? null, id: msingiKey.split(":")[1], path: p?.path ?? [], learnerImpact: p?.impact ?? {} },
      official: subj || str || ss ? {
        grade: subj?.grade ?? null, subject: subj ? `${subj.code} — ${subj.name}` : null, subjectStatus: subj?.status ?? null,
        strand: str ? `${str.number} ${str.name}` : null, subStrand: ss ? `${ss.number} ${ss.name}` : null,
        suggestedLessons: ss?.lessons ?? null, sourcePage: ss?.page ?? str?.page ?? null,
        source: subj ? { title: subj.docTitle, isbn: subj.isbn, revision: subj.revision, access: subj.access, isDraft: subj.isDraft } : null,
      } : null,
      officialIds: { subjectId: m.curriculumSubjectId, strandId: m.curriculumStrandId, subStrandId: m.curriculumSubStrandId },
      matchStatus: m.matchStatus, notes: m.notes,
      reviewedAt: m.reviewedAt, reviewedBy: reviewerName ?? null,
    };
  });

  // Stable order so a row doesn't jump when it is saved: items that need a
  // decision first, then by where the Msingi content sits.
  const PRIORITY: Record<string, number> = { needs_review: 0, no_match: 1, probable: 2, exact: 3, supplementary: 4 };
  mappings.sort((a, b) => (PRIORITY[a.matchStatus] ?? 9) - (PRIORITY[b.matchStatus] ?? 9)
    || a.msingi.path.join(" › ").localeCompare(b.msingi.path.join(" › ")) || a.id.localeCompare(b.id));

  const summary = Object.fromEntries(["exact", "probable", "needs_review", "no_match", "supplementary"].map((s) => [s, mappings.filter((x) => x.matchStatus === s).length]));
  return {
    summary, total: mappings.length, unreviewed: mappings.filter((x) => !x.reviewedAt).length,
    mappings,
    candidates: [...candidates.values()].map((c) => ({ ...c, strands: [...c.strands.values()] })),
  };
}
