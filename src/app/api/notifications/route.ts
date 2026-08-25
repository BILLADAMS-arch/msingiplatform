import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, desc, isNull, and } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const ANY_ROLE = ["STUDENT", "TEACHER", "PARENT", "ADMIN"] as const;

// GET — the caller's 20 most recent notifications + unread count.
export async function GET() {
  const guard = await requireRole([...ANY_ROLE]);
  if ("error" in guard) return guard.error;
  const userId = guard.session.user.id;

  const rows = await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(20);
  const unreadCount = (await db.select().from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))).length;

  return NextResponse.json({ notifications: rows, unreadCount });
}

// PATCH { markAllRead: true } — marks every unread notification as read.
export async function PATCH() {
  const guard = await requireRole([...ANY_ROLE]);
  if ("error" in guard) return guard.error;
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, guard.session.user.id), isNull(notifications.readAt)));
  return NextResponse.json({ ok: true });
}
