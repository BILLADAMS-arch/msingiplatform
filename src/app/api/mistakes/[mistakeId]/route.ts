import { NextResponse } from "next/server";
import { db } from "@/db";
import { mistakes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

export async function PATCH(_req: Request, { params }: { params: Promise<{ mistakeId: string }> }) {
  const guard = await requireRole(["STUDENT"]);
  if ("error" in guard) return guard.error;
  const { mistakeId } = await params;

  const [m] = await db.select().from(mistakes).where(eq(mistakes.id, mistakeId)).limit(1);
  if (!m || m.userId !== guard.session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.update(mistakes).set({ masteredAt: new Date() }).where(eq(mistakes.id, mistakeId));
  return NextResponse.json({ ok: true });
}
