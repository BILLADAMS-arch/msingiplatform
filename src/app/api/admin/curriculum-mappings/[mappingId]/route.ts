import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/api-guard";
import { MATCH_STATUSES } from "@/lib/curriculum-review";
import { reviewMapping } from "@/lib/curriculum-review-server";

const bodySchema = z.object({
  matchStatus: z.enum(MATCH_STATUSES),
  curriculumSubjectId: z.string().uuid().nullable().optional(),
  curriculumStrandId: z.string().uuid().nullable().optional(),
  curriculumSubStrandId: z.string().uuid().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

// PATCH /api/admin/curriculum-mappings/:id — record an admin's review decision.
// Touches only that mapping row; never moves or deletes Msingi content or learner data.
export async function PATCH(req: Request, { params }: { params: Promise<{ mappingId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { mappingId } = await params;
  if (!z.string().uuid().safeParse(mappingId).success) return NextResponse.json({ error: "Invalid mapping id." }, { status: 400 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = await reviewMapping(mappingId, guard.session.user.id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, mapping: { id: result.mapping.id, matchStatus: result.mapping.matchStatus, reviewedAt: result.mapping.reviewedAt } });
}
