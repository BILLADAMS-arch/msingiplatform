import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { flashcardProgress } from "@/db/schema";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({
  flashcardId: z.string().uuid(),
  status: z.enum(["easy", "difficult", "review_later"]),
});

// POST — records how the signed-in student rated a flashcard (upserts).
export async function POST(req: Request) {
  const guard = await requireRole(["STUDENT"]);
  if ("error" in guard) return guard.error;
  const userId = guard.session.user.id;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { flashcardId, status } = parsed.data;

  await db.insert(flashcardProgress)
    .values({ userId, flashcardId, status, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [flashcardProgress.userId, flashcardProgress.flashcardId],
      set: { status, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
