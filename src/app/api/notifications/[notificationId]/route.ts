import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

export async function PATCH(_req: Request, { params }: { params: Promise<{ notificationId: string }> }) {
  const guard = await requireRole(["STUDENT", "TEACHER", "PARENT", "ADMIN"]);
  if ("error" in guard) return guard.error;
  const { notificationId } = await params;

  await db.update(notifications).set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, guard.session.user.id)));
  return NextResponse.json({ ok: true });
}
