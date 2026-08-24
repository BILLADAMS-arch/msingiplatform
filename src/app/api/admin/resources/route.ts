import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { resources, subjects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { uploadResourceFile } from "@/lib/supabase/storage";

// GET /api/admin/resources — every resource, including unpublished drafts
// (the student-facing GET /api/resources filters those out).
export async function GET() {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;

  const rows = await db.select({ resource: resources, subjectName: subjects.name })
    .from(resources).innerJoin(subjects, eq(subjects.id, resources.subjectId)).orderBy(desc(resources.id));

  return NextResponse.json({
    resources: rows.map((r) => ({
      id: r.resource.id, title: r.resource.title, type: r.resource.type, published: r.resource.published,
      fileUrl: r.resource.fileUrl, subjectName: r.subjectName,
    })),
  });
}

const metaSchema = z.object({
  title: z.string().min(1).max(160),
  type: z.enum(["notes", "worksheet", "past_paper", "marking_scheme", "video", "summary", "flashcard_set"]),
  gradeId: z.string().uuid(),
  subjectId: z.string().uuid(),
  topicId: z.string().uuid().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

// POST /api/admin/resources — multipart/form-data upload (teacher/admin
// only). Uploads the file to Supabase Storage, then creates the `resources`
// row pointing at its public URL.
export async function POST(req: Request) {
  const guard = await requireRole(["TEACHER", "ADMIN"]);
  if ("error" in guard) return guard.error;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "A file is required." }, { status: 400 });

  const parsed = metaSchema.safeParse({
    title: form.get("title"),
    type: form.get("type"),
    gradeId: form.get("gradeId"),
    subjectId: form.get("subjectId"),
    topicId: form.get("topicId") || undefined,
    difficulty: form.get("difficulty") || undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { title, type, gradeId, subjectId, topicId, difficulty } = parsed.data;

  const path = `${gradeId}/${subjectId}/${crypto.randomUUID()}-${file.name}`;
  const fileUrl = await uploadResourceFile(path, file);

  const [resource] = await db.insert(resources).values({
    title, type, gradeId, subjectId, topicId, difficulty, fileUrl,
  }).returning();

  return NextResponse.json({ resource }, { status: 201 });
}
