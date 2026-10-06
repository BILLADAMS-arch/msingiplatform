import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-guard";
import { listMappingsForReview } from "@/lib/curriculum-review-server";

// GET /api/admin/curriculum-mappings — every mapping between Msingi content and
// the official structure, with the evidence an admin needs to review it
// (where the content sits, the official candidate and its source, and how much
// learner data depends on it). Read-only.
export async function GET() {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  return NextResponse.json(await listMappingsForReview());
}
