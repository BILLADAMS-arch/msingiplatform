import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { lessons, lessonSections, quickChecks } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const sectionSchema = z.object({
  kind: z.enum(["learn", "example", "keypoint", "vocab"]),
  heading: z.string().min(1).max(80),
  body: z.string().min(1),
  note: z.string().optional(),
});
const quickCheckSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
});
const bodySchema = z.object({
  title: z.string().min(1).max(160).optional(),
  published: z.boolean().optional(),
  sections: z.array(sectionSchema).optional(),
  quickCheck: quickCheckSchema.nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { lessonId } = await params;

  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const sections = await db.select().from(lessonSections).where(eq(lessonSections.lessonId, lessonId)).orderBy(asc(lessonSections.order));
  const [quickCheck] = await db.select().from(quickChecks).where(eq(quickChecks.lessonId, lessonId)).limit(1);

  return NextResponse.json({
    id: lesson.id, title: lesson.title, topicId: lesson.topicId, published: lesson.published,
    sections: sections.map((s) => ({ kind: s.kind, heading: s.heading, body: s.body, note: s.note })),
    quickCheck: quickCheck ? { question: quickCheck.question, options: quickCheck.options, correctIndex: quickCheck.correctIndex, explanation: quickCheck.explanation } : null,
  });
}

// PATCH — updates title/published, and (when provided) wholesale-replaces the
// lesson's sections and quick check — simplest correct model for a CMS
// without content versioning (explicitly out of scope for this stage).
export async function PATCH(req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { lessonId } = await params;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { title, published, sections, quickCheck } = parsed.data;

  if (title !== undefined || published !== undefined) {
    await db.update(lessons).set({ ...(title !== undefined ? { title } : {}), ...(published !== undefined ? { published } : {}) }).where(eq(lessons.id, lessonId));
  }

  if (sections) {
    await db.delete(lessonSections).where(eq(lessonSections.lessonId, lessonId));
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      await db.insert(lessonSections).values({ lessonId, kind: s.kind, heading: s.heading, body: s.body, note: s.note ?? null, order: i });
    }
  }

  if (quickCheck !== undefined) {
    await db.delete(quickChecks).where(eq(quickChecks.lessonId, lessonId));
    if (quickCheck) {
      await db.insert(quickChecks).values({
        lessonId, question: quickCheck.question, options: quickCheck.options,
        correctIndex: quickCheck.correctIndex, explanation: quickCheck.explanation,
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { lessonId } = await params;
  await db.delete(lessons).where(eq(lessons.id, lessonId));
  return NextResponse.json({ ok: true });
}
