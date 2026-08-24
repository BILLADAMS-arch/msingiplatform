import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

export async function POST(_req: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const guard = await requireRole(["STUDENT", "TEACHER", "PARENT", "ADMIN"]);
  if ("error" in guard) return guard.error;
  const { resourceId } = await params;

  await db.insert(bookmarks).values({ userId: guard.session.user.id, resourceId }).onConflictDoNothing();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ resourceId: string }> }) {
  const guard = await requireRole(["STUDENT", "TEACHER", "PARENT", "ADMIN"]);
  if ("error" in guard) return guard.error;
  const { resourceId } = await params;

  await db.delete(bookmarks).where(and(eq(bookmarks.userId, guard.session.user.id), eq(bookmarks.resourceId, resourceId)));
  return NextResponse.json({ ok: true });
}
