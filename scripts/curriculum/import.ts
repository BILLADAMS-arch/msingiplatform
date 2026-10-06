/**
 * Official curriculum importer (structure & metadata only).
 *
 *   npx tsx --env-file=.env scripts/curriculum/import.ts            # dry run (default): validate, run in a transaction, roll back, report
 *   npx tsx --env-file=.env scripts/curriculum/import.ts --apply    # same, but commit
 *   npx tsx --env-file=.env scripts/curriculum/import.ts --rollback [--apply]   # remove ONLY this version's imported rows
 *   npx tsx --env-file=.env scripts/curriculum/import.ts --with-migration drizzle/0009_curriculum_architecture.sql
 *       # dry run only: applies the migration inside the same transaction first,
 *       # so the import can be rehearsed against a database that doesn't have
 *       # the new tables yet. Everything (DDL included) is rolled back.
 *
 * Guarantees:
 * - Idempotent: every row is keyed on a natural unique key and compared before
 *   writing, so a second run reports 0 inserted / 0 updated.
 * - Transaction-safe: one transaction; any error rolls everything back.
 * - Never deletes Msingi content and never touches learner tables (progress,
 *   mistakes, attempts, answers). Mappings link by ID; nothing is moved.
 * - Stores no KICD learning-outcome text or other substantial KICD prose.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../src/db";
import {
  grades, subjects, strands, subStrands, topics,
  curriculumFrameworks, curriculumVersions, curriculumLevels, curriculumGradeLevels, curriculumPathways,
  sourceDocuments, sourceDocumentGrades, curriculumSubjects, curriculumStrands, curriculumSubStrands, curriculumMappings,
} from "../../src/db/schema";

const ROOT = join(__dirname, "..", "..", "curriculum");
const VERSION_DIR = join(ROOT, "cbc", "kicd-2026-10");
const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const ROLLBACK = args.has("--rollback");
const argv = process.argv.slice(2);
const WITH_MIGRATION = argv.includes("--with-migration") ? argv[argv.indexOf("--with-migration") + 1] : null;
if (WITH_MIGRATION !== null && (APPLY || ROLLBACK || !WITH_MIGRATION)) {
  console.error("--with-migration <file> is for dry runs only (no --apply / --rollback).");
  process.exit(1);
}

/* ----------------------------------------------------------------------- */
/* Input schemas                                                            */
/* ----------------------------------------------------------------------- */
const GradeCode = z.string().regex(/^(PP[12]|G([1-9]|1[0-2]))$/);
const Code = z.string().regex(/^[A-Z0-9_]+$/);
const Num = z.string().regex(/^\d+\.\d+$/);

const FrameworkFile = z.object({
  framework: z.object({ code: Code, name: z.string(), authority: z.string() }),
  version: z.object({ code: z.string(), label: z.string(), status: z.enum(["draft", "active", "archived"]), effectiveFrom: z.string().nullable(), notes: z.string().nullable() }),
  levels: z.array(z.object({ code: Code, name: z.string(), grades: z.array(GradeCode) })),
  pathways: z.array(z.object({ code: Code, name: z.string(), level: Code })),
});
const RegistryFile = z.object({
  retrievedAt: z.string(),
  documents: z.array(z.object({
    driveFileId: z.string(), kicdPageUrl: z.string().url(), learningAreaLabel: z.string().nullable(), officialTitle: z.string().nullable(),
    grades: z.array(GradeCode).min(1), accessStatus: z.enum(["viewable", "restricted", "downloadable", "unknown"]),
    downloadAllowed: z.boolean().nullable(), isDraft: z.boolean().nullable(), isbn: z.string().nullable(),
    firstPublished: z.string().nullable(), revisionLabel: z.string().nullable(), notes: z.string().nullable(),
  })),
});
const SubjectFile = z.object({
  grade: GradeCode, level: Code, code: Code, name: z.string(), category: z.enum(["core", "pathway", "optional", "general"]),
  isOptional: z.boolean(), status: z.enum(["draft", "active", "archived"]), sourceDriveFileId: z.string(), expectedTotalLessons: z.number().int().optional(),
  strands: z.array(z.object({
    number: Num, name: z.string().max(200), sourcePage: z.string().optional(),
    subStrands: z.array(z.object({ number: Num, name: z.string().max(200), suggestedLessons: z.number().int().positive().nullable() })),
  })),
}).passthrough();
const SeniorFile = z.object({
  subjects: z.array(z.object({
    grade: GradeCode, code: Code, name: z.string(), category: z.enum(["core", "pathway", "optional", "general"]),
    pathway: Code.nullable(), status: z.enum(["draft", "active", "archived"]), sourceDriveFileId: z.string().nullable(), sortOrder: z.number().int(), notes: z.string().nullable(),
  })),
});
const MappingFile = z.object({
  version: z.string(),
  mappings: z.array(z.object({
    kind: z.enum(["subject", "strand", "sub_strand", "topic"]), id: z.string().uuid(), label: z.string(),
    status: z.enum(["exact", "probable", "needs_review", "no_match", "supplementary"]),
    target: z.object({ grade: GradeCode, subject: Code, strand: Num.optional(), subStrand: Num.optional() }).optional(),
    notes: z.string().optional(),
  })),
});

const read = <T>(schema: z.ZodType<T>, path: string): T => schema.parse(JSON.parse(readFileSync(path, "utf8")));

/* ----------------------------------------------------------------------- */
/* Validation (before touching the database)                                */
/* ----------------------------------------------------------------------- */
const framework = read(FrameworkFile, join(VERSION_DIR, "framework.json"));
const registry = read(RegistryFile, join(ROOT, "sources", "kicd-regular-registry.json"));
const pilot = ["g7-mathematics.json", "g7-integrated-science.json"].map((f) => read(SubjectFile, join(VERSION_DIR, "pilot", f)));
const senior = read(SeniorFile, join(VERSION_DIR, "senior-school-subjects.json"));
const mappingFile = read(MappingFile, join(ROOT, "mappings", `${framework.version.code}.existing-content.json`));

const errors: string[] = [];
const warnings: string[] = [];
const driveIds = new Set(registry.documents.map((d) => d.driveFileId));
if (driveIds.size !== registry.documents.length) errors.push("Registry has duplicate driveFileId entries.");
if (mappingFile.version !== framework.version.code) errors.push(`Mapping file is for ${mappingFile.version}, not ${framework.version.code}.`);
const levelCodes = new Set(framework.levels.map((l) => l.code));
const pathwayCodes = new Set(framework.pathways.map((p) => p.code));
const levelOfGrade = new Map(framework.levels.flatMap((l) => l.grades.map((g) => [g, l.code] as const)));

for (const s of pilot) {
  const where = `${s.grade} ${s.code}`;
  if (!driveIds.has(s.sourceDriveFileId)) errors.push(`${where}: source ${s.sourceDriveFileId} is not in the registry.`);
  if (!levelCodes.has(s.level) || levelOfGrade.get(s.grade) !== s.level) errors.push(`${where}: level ${s.level} does not contain ${s.grade}.`);
  s.strands.forEach((st, i) => {
    if (st.number !== `${i + 1}.0`) errors.push(`${where}: strand #${i + 1} is numbered ${st.number}.`);
    st.subStrands.forEach((ss, j) => {
      if (ss.number !== `${i + 1}.${j + 1}`) errors.push(`${where}: sub-strand ${ss.number} out of sequence under ${st.number}.`);
    });
  });
  const total = s.strands.flatMap((st) => st.subStrands).reduce((a, ss) => a + (ss.suggestedLessons ?? 0), 0);
  if (s.expectedTotalLessons !== undefined && total !== s.expectedTotalLessons) errors.push(`${where}: sub-strand lessons total ${total}, design says ${s.expectedTotalLessons}.`);
}
const seniorKeys = new Set<string>();
for (const s of senior.subjects) {
  const key = `${s.grade}:${s.code}`;
  if (seniorKeys.has(key)) errors.push(`Senior School duplicate subject ${key}.`);
  seniorKeys.add(key);
  if (levelOfGrade.get(s.grade) !== "SENIOR_SCHOOL") errors.push(`${key}: not a Senior School grade.`);
  if (s.category === "pathway" && (!s.pathway || !pathwayCodes.has(s.pathway))) errors.push(`${key}: pathway subject without a valid pathway.`);
  if (s.category !== "pathway" && s.pathway) errors.push(`${key}: only pathway subjects may have a pathway.`);
  if (s.sourceDriveFileId && !driveIds.has(s.sourceDriveFileId)) errors.push(`${key}: source not in registry.`);
  if (s.status !== "draft") errors.push(`${key}: Senior School designs are KICD drafts; status must be 'draft'.`);
}
const pilotNode = (t: { grade: string; subject: string; strand?: string; subStrand?: string }) => {
  const s = pilot.find((p) => p.grade === t.grade && p.code === t.subject);
  if (!s) return false;
  const st = t.strand ? s.strands.find((x) => x.number === t.strand) : undefined;
  if (t.strand && !st) return false;
  if (t.subStrand && !st?.subStrands.some((x) => x.number === t.subStrand)) return false;
  return true;
};
const mapIds = new Set<string>();
for (const m of mappingFile.mappings) {
  if (mapIds.has(m.id)) errors.push(`Mapping duplicated for ${m.kind} ${m.id}.`);
  mapIds.add(m.id);
  if (m.target && !pilotNode(m.target)) errors.push(`Mapping ${m.label}: target ${JSON.stringify(m.target)} is not in the pilot structure.`);
  if (m.status !== "no_match" && m.status !== "needs_review" && !m.target) errors.push(`Mapping ${m.label}: '${m.status}' needs a target.`);
}
if (errors.length) {
  console.error("VALIDATION FAILED — nothing was written:\n - " + errors.join("\n - "));
  process.exit(1);
}

/* ----------------------------------------------------------------------- */
/* Upsert helpers with change detection                                     */
/* ----------------------------------------------------------------------- */
type Tally = { inserted: number; updated: number; unchanged: number };
const report: Record<string, Tally> = {};
const tally = (name: string, what: keyof Tally) => { (report[name] ??= { inserted: 0, updated: 0, unchanged: 0 })[what]++; };
const differs = (row: Record<string, unknown>, values: Record<string, unknown>) =>
  Object.entries(values).some(([k, v]) => {
    const cur = row[k];
    if (cur instanceof Date || v instanceof Date) return new Date(cur as string).getTime() !== new Date(v as string).getTime();
    return (cur ?? null) !== (v ?? null);
  });

class DryRunRollback extends Error {}
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function upsert<T extends { id: string }>(
  name: string, find: () => Promise<T | undefined>, insert: () => Promise<T>, values: Record<string, unknown>, update: () => Promise<unknown>,
): Promise<T> {
  const existing = await find();
  if (!existing) { tally(name, "inserted"); return insert(); }
  // update() may return false to signal it deliberately left the row alone.
  if (differs(existing as Record<string, unknown>, values) && (await update()) !== false) tally(name, "updated");
  else tally(name, "unchanged");
  return existing;
}

/* ----------------------------------------------------------------------- */
/* Import                                                                   */
/* ----------------------------------------------------------------------- */
async function runImport(tx: Tx) {
  const now = new Date();
  const gradeRows = await tx.select().from(grades);
  const gradeId = new Map(gradeRows.filter((g) => g.code).map((g) => [g.code as string, g.id]));
  for (const l of framework.levels) for (const g of l.grades) if (!gradeId.has(g)) throw new Error(`Grade ${g} not found (is migration 0009 applied so grades.code is backfilled?).`);

  const fw = framework.framework;
  const fwRow = await upsert("curriculum_frameworks",
    async () => (await tx.select().from(curriculumFrameworks).where(eq(curriculumFrameworks.code, fw.code)))[0],
    async () => (await tx.insert(curriculumFrameworks).values({ code: fw.code, name: fw.name, authority: fw.authority }).returning())[0],
    { name: fw.name, authority: fw.authority },
    () => tx.update(curriculumFrameworks).set({ name: fw.name, authority: fw.authority, updatedAt: now }).where(eq(curriculumFrameworks.code, fw.code)));

  const v = framework.version;
  const vVals = { label: v.label, status: v.status, effectiveFrom: v.effectiveFrom, notes: v.notes };
  const version = await upsert("curriculum_versions",
    async () => (await tx.select().from(curriculumVersions).where(and(eq(curriculumVersions.frameworkId, fwRow.id), eq(curriculumVersions.code, v.code))))[0],
    async () => (await tx.insert(curriculumVersions).values({ frameworkId: fwRow.id, code: v.code, ...vVals }).returning())[0],
    vVals,
    () => tx.update(curriculumVersions).set({ ...vVals, updatedAt: now }).where(and(eq(curriculumVersions.frameworkId, fwRow.id), eq(curriculumVersions.code, v.code))));

  const levelId = new Map<string, string>();
  for (const [i, l] of framework.levels.entries()) {
    const vals = { name: l.name, sortOrder: i };
    const row = await upsert("curriculum_levels",
      async () => (await tx.select().from(curriculumLevels).where(and(eq(curriculumLevels.versionId, version.id), eq(curriculumLevels.code, l.code))))[0],
      async () => (await tx.insert(curriculumLevels).values({ versionId: version.id, code: l.code, ...vals }).returning())[0],
      vals,
      () => tx.update(curriculumLevels).set({ ...vals, updatedAt: now }).where(and(eq(curriculumLevels.versionId, version.id), eq(curriculumLevels.code, l.code))));
    levelId.set(l.code, row.id);
    for (const g of l.grades) {
      const gid = gradeId.get(g)!;
      await upsert("curriculum_grade_levels",
        async () => (await tx.select().from(curriculumGradeLevels).where(and(eq(curriculumGradeLevels.versionId, version.id), eq(curriculumGradeLevels.gradeId, gid))))[0],
        async () => (await tx.insert(curriculumGradeLevels).values({ versionId: version.id, levelId: row.id, gradeId: gid }).returning())[0],
        { levelId: row.id },
        () => tx.update(curriculumGradeLevels).set({ levelId: row.id, updatedAt: now }).where(and(eq(curriculumGradeLevels.versionId, version.id), eq(curriculumGradeLevels.gradeId, gid))));
    }
  }

  const pathwayId = new Map<string, string>();
  for (const [i, p] of framework.pathways.entries()) {
    const vals = { name: p.name, levelId: levelId.get(p.level)!, sortOrder: i };
    const row = await upsert("curriculum_pathways",
      async () => (await tx.select().from(curriculumPathways).where(and(eq(curriculumPathways.versionId, version.id), eq(curriculumPathways.code, p.code))))[0],
      async () => (await tx.insert(curriculumPathways).values({ versionId: version.id, code: p.code, ...vals }).returning())[0],
      vals,
      () => tx.update(curriculumPathways).set({ ...vals, updatedAt: now }).where(and(eq(curriculumPathways.versionId, version.id), eq(curriculumPathways.code, p.code))));
    pathwayId.set(p.code, row.id);
  }

  // Source registry
  const docId = new Map<string, string>();
  const retrievedAt = new Date(registry.retrievedAt);
  for (const d of registry.documents) {
    const vals = {
      kicdPageUrl: d.kicdPageUrl, officialTitle: d.officialTitle, learningAreaLabel: d.learningAreaLabel, isbn: d.isbn,
      firstPublished: d.firstPublished, revisionLabel: d.revisionLabel, retrievedAt, accessStatus: d.accessStatus,
      downloadAllowed: d.downloadAllowed, isDraft: d.isDraft, notes: d.notes,
    };
    const row = await upsert("source_documents",
      async () => (await tx.select().from(sourceDocuments).where(and(eq(sourceDocuments.versionId, version.id), eq(sourceDocuments.driveFileId, d.driveFileId))))[0],
      async () => (await tx.insert(sourceDocuments).values({ versionId: version.id, driveFileId: d.driveFileId, ...vals }).returning())[0],
      vals,
      () => tx.update(sourceDocuments).set({ ...vals, updatedAt: now }).where(and(eq(sourceDocuments.versionId, version.id), eq(sourceDocuments.driveFileId, d.driveFileId))));
    docId.set(d.driveFileId, row.id);
    for (const g of d.grades) {
      const gid = gradeId.get(g)!;
      const has = (await tx.select().from(sourceDocumentGrades).where(and(eq(sourceDocumentGrades.sourceDocumentId, row.id), eq(sourceDocumentGrades.gradeId, gid))))[0];
      if (has) tally("source_document_grades", "unchanged");
      else { await tx.insert(sourceDocumentGrades).values({ sourceDocumentId: row.id, gradeId: gid }); tally("source_document_grades", "inserted"); }
    }
  }

  // Official subjects: pilot (with structure) + Senior School catalogue (no structure, draft)
  const subjectRows = [
    ...pilot.map((s, i) => ({ grade: s.grade, code: s.code, name: s.name, category: s.category, pathway: null as string | null, isOptional: s.isOptional, status: s.status, sourceDriveFileId: s.sourceDriveFileId as string | null, sortOrder: i })),
    ...senior.subjects.map((s) => ({ grade: s.grade, code: s.code, name: s.name, category: s.category, pathway: s.pathway, isOptional: false, status: s.status, sourceDriveFileId: s.sourceDriveFileId, sortOrder: s.sortOrder })),
  ];
  const cSubjectId = new Map<string, string>();
  for (const s of subjectRows) {
    const gid = gradeId.get(s.grade)!;
    const vals = {
      levelId: levelId.get(levelOfGrade.get(s.grade)!)!, name: s.name, category: s.category, pathwayId: s.pathway ? pathwayId.get(s.pathway)! : null,
      isOptional: s.isOptional, status: s.status, sourceDocumentId: s.sourceDriveFileId ? docId.get(s.sourceDriveFileId)! : null, sortOrder: s.sortOrder,
    };
    const key = and(eq(curriculumSubjects.versionId, version.id), eq(curriculumSubjects.gradeId, gid), eq(curriculumSubjects.code, s.code));
    const row = await upsert("curriculum_subjects",
      async () => (await tx.select().from(curriculumSubjects).where(key))[0],
      async () => (await tx.insert(curriculumSubjects).values({ versionId: version.id, gradeId: gid, code: s.code, ...vals }).returning())[0],
      vals,
      () => tx.update(curriculumSubjects).set({ ...vals, updatedAt: now }).where(key));
    cSubjectId.set(`${s.grade}:${s.code}`, row.id);
  }

  // Pilot structure
  const cStrandId = new Map<string, string>();
  const cSubStrandId = new Map<string, string>();
  for (const s of pilot) {
    const subjId = cSubjectId.get(`${s.grade}:${s.code}`)!;
    for (const [i, st] of s.strands.entries()) {
      const vals = { name: st.name, sortOrder: i, sourcePage: st.sourcePage ?? null };
      const key = and(eq(curriculumStrands.curriculumSubjectId, subjId), eq(curriculumStrands.number, st.number));
      const row = await upsert("curriculum_strands",
        async () => (await tx.select().from(curriculumStrands).where(key))[0],
        async () => (await tx.insert(curriculumStrands).values({ curriculumSubjectId: subjId, number: st.number, ...vals }).returning())[0],
        vals,
        () => tx.update(curriculumStrands).set({ ...vals, updatedAt: now }).where(key));
      cStrandId.set(`${s.grade}:${s.code}:${st.number}`, row.id);
      for (const [j, ss] of st.subStrands.entries()) {
        const sVals = { name: ss.name, suggestedLessons: ss.suggestedLessons, sortOrder: j, sourcePage: st.sourcePage ?? null };
        const sKey = and(eq(curriculumSubStrands.strandId, row.id), eq(curriculumSubStrands.number, ss.number));
        const sRow = await upsert("curriculum_sub_strands",
          async () => (await tx.select().from(curriculumSubStrands).where(sKey))[0],
          async () => (await tx.insert(curriculumSubStrands).values({ strandId: row.id, number: ss.number, ...sVals }).returning())[0],
          sVals,
          () => tx.update(curriculumSubStrands).set({ ...sVals, updatedAt: now }).where(sKey));
        cSubStrandId.set(`${s.grade}:${s.code}:${ss.number}`, sRow.id);
      }
    }
  }

  // Existing-content mappings (by ID; skips records that don't exist in this database)
  const exists = {
    subject: new Set((await tx.select({ id: subjects.id }).from(subjects)).map((r) => r.id)),
    strand: new Set((await tx.select({ id: strands.id }).from(strands)).map((r) => r.id)),
    sub_strand: new Set((await tx.select({ id: subStrands.id }).from(subStrands)).map((r) => r.id)),
    topic: new Set((await tx.select({ id: topics.id }).from(topics)).map((r) => r.id)),
  };
  const col = { subject: curriculumMappings.subjectId, strand: curriculumMappings.strandId, sub_strand: curriculumMappings.subStrandId, topic: curriculumMappings.topicId } as const;
  const field = { subject: "subjectId", strand: "strandId", sub_strand: "subStrandId", topic: "topicId" } as const;
  for (const m of mappingFile.mappings) {
    if (!exists[m.kind].has(m.id)) { warnings.push(`Mapping skipped — ${m.kind} ${m.id} (${m.label}) not in this database.`); tally("curriculum_mappings", "unchanged"); continue; }
    const t = m.target;
    const vals = {
      curriculumSubjectId: t ? cSubjectId.get(`${t.grade}:${t.subject}`) ?? null : null,
      curriculumStrandId: t?.strand ? cStrandId.get(`${t.grade}:${t.subject}:${t.strand}`) ?? null : null,
      curriculumSubStrandId: t?.subStrand ? cSubStrandId.get(`${t.grade}:${t.subject}:${t.subStrand}`) ?? null : null,
      matchStatus: m.status, notes: m.notes ?? null,
    };
    const key = and(eq(curriculumMappings.versionId, version.id), eq(col[m.kind], m.id));
    await upsert("curriculum_mappings",
      async () => (await tx.select().from(curriculumMappings).where(key))[0],
      async () => (await tx.insert(curriculumMappings).values({ versionId: version.id, [field[m.kind]]: m.id, ...vals }).returning())[0],
      vals,
      // Re-imports refresh the auto-classification only for rows nobody has reviewed yet.
      async () => {
        const [cur] = await tx.select().from(curriculumMappings).where(key);
        if (cur?.reviewedAt) { warnings.push(`Mapping for ${m.label} was reviewed by an admin — left unchanged.`); return false; }
        await tx.update(curriculumMappings).set({ ...vals, updatedAt: now }).where(key);
      });
  }
}

/* ----------------------------------------------------------------------- */
/* Rollback (this version's imported rows only)                             */
/* ----------------------------------------------------------------------- */
async function runRollback(tx: Tx) {
  const [fw] = await tx.select().from(curriculumFrameworks).where(eq(curriculumFrameworks.code, framework.framework.code));
  const [version] = fw ? await tx.select().from(curriculumVersions).where(and(eq(curriculumVersions.frameworkId, fw.id), eq(curriculumVersions.code, framework.version.code))) : [];
  if (!version) { console.log("Nothing to roll back: version not found."); return; }
  const del = async (name: string, q: Promise<{ id?: string }[]>) => { const n = (await q).length; report[name] = { inserted: 0, updated: 0, unchanged: -n }; };
  const subjIds = (await tx.select({ id: curriculumSubjects.id }).from(curriculumSubjects).where(eq(curriculumSubjects.versionId, version.id))).map((r) => r.id);
  const strandIds = subjIds.length ? (await tx.select({ id: curriculumStrands.id }).from(curriculumStrands).where(inArray(curriculumStrands.curriculumSubjectId, subjIds))).map((r) => r.id) : [];
  const docIds = (await tx.select({ id: sourceDocuments.id }).from(sourceDocuments).where(eq(sourceDocuments.versionId, version.id))).map((r) => r.id);
  await del("curriculum_mappings", tx.delete(curriculumMappings).where(eq(curriculumMappings.versionId, version.id)).returning({ id: curriculumMappings.id }));
  if (strandIds.length) await del("curriculum_sub_strands", tx.delete(curriculumSubStrands).where(inArray(curriculumSubStrands.strandId, strandIds)).returning({ id: curriculumSubStrands.id }));
  if (subjIds.length) await del("curriculum_strands", tx.delete(curriculumStrands).where(inArray(curriculumStrands.curriculumSubjectId, subjIds)).returning({ id: curriculumStrands.id }));
  await del("curriculum_subjects", tx.delete(curriculumSubjects).where(eq(curriculumSubjects.versionId, version.id)).returning({ id: curriculumSubjects.id }));
  if (docIds.length) await del("source_document_grades", tx.delete(sourceDocumentGrades).where(inArray(sourceDocumentGrades.sourceDocumentId, docIds)).returning({ id: sourceDocumentGrades.sourceDocumentId }));
  await del("source_documents", tx.delete(sourceDocuments).where(eq(sourceDocuments.versionId, version.id)).returning({ id: sourceDocuments.id }));
  await del("curriculum_pathways", tx.delete(curriculumPathways).where(eq(curriculumPathways.versionId, version.id)).returning({ id: curriculumPathways.id }));
  await del("curriculum_grade_levels", tx.delete(curriculumGradeLevels).where(eq(curriculumGradeLevels.versionId, version.id)).returning({ id: curriculumGradeLevels.id }));
  await del("curriculum_levels", tx.delete(curriculumLevels).where(eq(curriculumLevels.versionId, version.id)).returning({ id: curriculumLevels.id }));
  await del("curriculum_versions", tx.delete(curriculumVersions).where(eq(curriculumVersions.id, version.id)).returning({ id: curriculumVersions.id }));
  const others = await tx.select().from(curriculumVersions).where(eq(curriculumVersions.frameworkId, fw.id));
  if (!others.length) await del("curriculum_frameworks", tx.delete(curriculumFrameworks).where(eq(curriculumFrameworks.id, fw.id)).returning({ id: curriculumFrameworks.id }));
}

/* ----------------------------------------------------------------------- */
async function main() {
  const mode = `${ROLLBACK ? "ROLLBACK" : "IMPORT"} ${APPLY ? "(APPLY — will commit)" : "(DRY RUN — will roll back)"}`;
  console.log(`Curriculum ${mode} — version ${framework.version.code}`);
  console.log(`Inputs: ${registry.documents.length} source documents, ${pilot.length} pilot subjects (${pilot.reduce((a, s) => a + s.strands.length, 0)} strands, ${pilot.reduce((a, s) => a + s.strands.flatMap((x) => x.subStrands).length, 0)} sub-strands), ${senior.subjects.length} Senior School subject rows, ${mappingFile.mappings.length} mappings`);
  try {
    await db.transaction(async (tx) => {
      if (WITH_MIGRATION) {
        // Don't queue behind live traffic for long: give up instead of blocking learners.
        await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
        const statements = readFileSync(WITH_MIGRATION, "utf8").split("--> statement-breakpoint").map((x) => x.trim()).filter(Boolean);
        for (const st of statements) await tx.execute(sql.raw(st));
        console.log(`Applied ${statements.length} migration statements inside the transaction (will be rolled back).`);
      }
      if (ROLLBACK) await runRollback(tx); else await runImport(tx);
      if (!APPLY) throw new DryRunRollback();
    });
  } catch (e) {
    if (!(e instanceof DryRunRollback)) throw e;
  }
  console.table(report);
  if (!ROLLBACK) {
    const byStatus = mappingFile.mappings.reduce<Record<string, number>>((a, m) => ((a[m.status] = (a[m.status] ?? 0) + 1), a), {});
    console.log("Mapping classification:", byStatus);
  }
  if (warnings.length) console.log("Warnings:\n - " + warnings.join("\n - "));
  console.log(APPLY ? "Committed." : "Dry run complete — all changes were rolled back.");
}

main().then(() => process.exit(0)).catch((e) => { console.error("FAILED — transaction rolled back:", e); process.exit(1); });
