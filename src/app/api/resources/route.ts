import { NextResponse } from "next/server";
import { db } from "@/db";
import { resources, bookmarks } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// GET /api/resources?gradeId=&subjectId=&topicId=&type=&difficulty=&bookmarkedOnly=1
// Any signed-in user can browse the library, filtered down the curriculum
// tree plus type/difficulty; each row is annotated with whether the caller
// has bookmarked it.
export async function GET(req: Request) {
  const guard = await requireRole(["STUDENT", "TEACHER", "PARENT", "ADMIN"]);
  if ("error" in guard) return guard.error;
  const userId = guard.session.user.id;

  const url = new URL(req.url);
  const gradeId = url.searchParams.get("gradeId");
  const subjectId = url.searchParams.get("subjectId");
  const topicId = url.searchParams.get("topicId");
  const type = url.searchParams.get("type");
  const difficulty = url.searchParams.get("difficulty");
  const bookmarkedOnly = url.searchParams.get("bookmarkedOnly") === "1";

  const conditions = [
    eq(resources.published, true),
    gradeId ? eq(resources.gradeId, gradeId) : undefined,
    subjectId ? eq(resources.subjectId, subjectId) : undefined,
    topicId ? eq(resources.topicId, topicId) : undefined,
    type ? eq(resources.type, type as typeof resources.$inferSelect.type) : undefined,
    difficulty ? eq(resources.difficulty, difficulty as Exclude<typeof resources.$inferSelect.difficulty, null>) : undefined,
  ].filter((c) => c !== undefined);

  const rows = await db.select().from(resources).where(conditions.length ? and(...conditions) : undefined);

  const myBookmarks = await db.select({ resourceId: bookmarks.resourceId }).from(bookmarks).where(eq(bookmarks.userId, userId));
  const bookmarkedIds = new Set(myBookmarks.map((b) => b.resourceId));

  const annotated = rows
    .map((r) => ({ ...r, bookmarked: bookmarkedIds.has(r.id) }))
    .filter((r) => !bookmarkedOnly || r.bookmarked);

  return NextResponse.json({ resources: annotated });
}
