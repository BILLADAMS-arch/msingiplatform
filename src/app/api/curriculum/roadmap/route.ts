import { NextResponse } from "next/server";
import { db } from "@/db";
import { topics, subStrands, strands, topicProgress, lessons } from "@/db/schema";
import { eq, asc, and, inArray } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";

// GET /api/curriculum/roadmap?subjectId=... — topics in order, with this
// learner's mastery and whether a lesson exists, so the client can render
// checkmarks / current / locked states without hard-coding topic names.
//
// Lessons and progress are fetched in one batched query each (not two
// queries per topic): several roadmaps are requested at once by the
// dashboard, and per-topic queries exhausted the connection pool.
export async function GET(req: Request) {
  const subjectId = new URL(req.url).searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ error: "subjectId query param is required" }, { status: 400 });

  const supabase = await createClient();
  const [{ data: { user } }, rows] = await Promise.all([
    supabase.auth.getUser(),
    db.select({ topic: topics })
      .from(topics)
      .innerJoin(subStrands, eq(topics.subStrandId, subStrands.id))
      .innerJoin(strands, eq(subStrands.strandId, strands.id))
      .where(eq(strands.subjectId, subjectId))
      .orderBy(asc(topics.order)),
  ]);

  const topicIds = rows.map((r) => r.topic.id);
  const [lessonRows, progressRows] = topicIds.length
    ? await Promise.all([
      db.select({ id: lessons.id, topicId: lessons.topicId }).from(lessons).where(inArray(lessons.topicId, topicIds)),
      user
        ? db.select({ topicId: topicProgress.topicId, masteryPct: topicProgress.masteryPct }).from(topicProgress)
          .where(and(eq(topicProgress.userId, user.id), inArray(topicProgress.topicId, topicIds)))
        : Promise.resolve([] as { topicId: string; masteryPct: number }[]),
    ])
    : [[], []];

  // Same result as before: any one lesson id for the topic, and 0 mastery if no progress row.
  const lessonByTopic = new Map<string, string>();
  for (const l of lessonRows) if (!lessonByTopic.has(l.topicId)) lessonByTopic.set(l.topicId, l.id);
  const masteryByTopic = new Map(progressRows.map((p) => [p.topicId, p.masteryPct]));

  const roadmap = rows.map(({ topic }) => ({
    id: topic.id, name: topic.name, order: topic.order,
    lessonId: lessonByTopic.get(topic.id) ?? null,
    masteryPct: masteryByTopic.get(topic.id) ?? 0,
  }));

  return NextResponse.json({ roadmap });
}
