import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({ role: z.enum(["STUDENT", "TEACHER", "PARENT", "ADMIN"]) });

// PATCH /api/admin/users/:userId — changes a user's role. Keeps our own
// `users.role` (what the app queries/joins against) and the Supabase Auth
// user's app_metadata.role (what proxy.ts/requireRole trust from the JWT) in
// sync — see src/lib/api-guard.ts and src/proxy.ts for why both exist.
export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const { userId } = await params;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { role } = parsed.data;

  const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await db.update(users).set({ role }).where(eq(users.id, userId));

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: { role } });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
