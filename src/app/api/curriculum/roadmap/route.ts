import { NextResponse } from "next/server";
import { db } from "@/db";
import { topics, subStrands, strands, subjects, topicProgress, lessons } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";

// GET /api/curriculum/roadmap?subjectId=... — topics in order, with this
// learner's mastery and whether a lesson exists, so the client can render
// checkmarks / current / locked states without hard-coding topic names.
export async function GET(req: Request) {
  const subjectId = new URL(req.url).searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ error: "subjectId query param is required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const rows = await db
    .select({ topic: topics, subStrand: subStrands, strand: strands })
    .from(topics)
    .innerJoin(subStrands, eq(topics.subStrandId, subStrands.id))
    .innerJoin(strands, eq(subStrands.strandId, strands.id))
    .where(eq(strands.subjectId, subjectId))
    .orderBy(asc(topics.order));

  const roadmap = await Promise.all(rows.map(async ({ topic }) => {
    const [lesson] = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.topicId, topic.id)).limit(1);
    let mastery = 0;
    if (user) {
      const [progress] = await db.select().from(topicProgress)
        .where(and(eq(topicProgress.userId, user.id), eq(topicProgress.topicId, topic.id))).limit(1);
      mastery = progress?.masteryPct ?? 0;
    }
    return { id: topic.id, name: topic.name, order: topic.order, lessonId: lesson?.id ?? null, masteryPct: mastery };
  }));

  return NextResponse.json({ roadmap });
}
