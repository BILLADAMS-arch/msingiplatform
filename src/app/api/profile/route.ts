import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { profiles, grades } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { isAuthOutage, AUTH_UNAVAILABLE_BODY } from "@/lib/supabase/auth-errors";

const patchSchema = z.object({
  gradeId: z.string().uuid().optional(),
  gradeName: z.string().optional(), // deprecated: older clients; gradeId wins when both are sent
  goal: z.string().optional(),
  onboarded: z.boolean().optional(),
  name: z.string().min(1).max(120).optional(),
  leaderboardOptOut: z.boolean().optional(),
});

// PATCH — completes onboarding (grade + goal) for the signed-in user.
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user) return isAuthOutage(error) ? NextResponse.json(AUTH_UNAVAILABLE_BODY, { status: 503 }) : NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { gradeName, goal, onboarded, name, leaderboardOptOut } = parsed.data;

  let gradeId: string | undefined;
  if (parsed.data.gradeId || gradeName) {
    const [grade] = await db.select().from(grades)
      .where(parsed.data.gradeId ? eq(grades.id, parsed.data.gradeId) : eq(grades.name, gradeName!)).limit(1);
    if (!grade) return NextResponse.json({ error: "Unknown grade." }, { status: 400 });
    gradeId = grade.id;
  }

  await db.update(profiles).set({
    ...(gradeId ? { gradeId } : {}),
    ...(goal ? { goal } : {}),
    ...(onboarded !== undefined ? { onboarded } : {}),
    ...(name ? { name } : {}),
    ...(leaderboardOptOut !== undefined ? { leaderboardOptOut } : {}),
  }).where(eq(profiles.userId, user.id));

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user) return isAuthOutage(error) ? NextResponse.json(AUTH_UNAVAILABLE_BODY, { status: 503 }) : NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const [row] = await db.select({ profile: profiles, gradeName: grades.name, gradeCode: grades.code })
    .from(profiles).leftJoin(grades, eq(profiles.gradeId, grades.id))
    .where(eq(profiles.userId, user.id)).limit(1);
  // gradeId is the identity; gradeName is for display only.
  return NextResponse.json({
    profile: row?.profile, gradeId: row?.profile?.gradeId ?? null, gradeCode: row?.gradeCode ?? null, gradeName: row?.gradeName ?? null,
  });
}
