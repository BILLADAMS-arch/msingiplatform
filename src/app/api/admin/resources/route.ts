import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { requireRole } from "@/lib/api-guard";
import { uploadResourceFile } from "@/lib/supabase/storage";

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
