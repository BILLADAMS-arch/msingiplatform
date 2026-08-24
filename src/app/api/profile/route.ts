import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { profiles, grades } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  gradeName: z.string().optional(),
  goal: z.string().optional(),
  onboarded: z.boolean().optional(),
});

// PATCH — completes onboarding (grade + goal) for the signed-in user.
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { gradeName, goal, onboarded } = parsed.data;

  let gradeId: string | undefined;
  if (gradeName) {
    const [grade] = await db.select().from(grades).where(eq(grades.name, gradeName)).limit(1);
    if (!grade) return NextResponse.json({ error: `Unknown grade: ${gradeName}` }, { status: 400 });
    gradeId = grade.id;
  }

  await db.update(profiles).set({
    ...(gradeId ? { gradeId } : {}),
    ...(goal ? { goal } : {}),
    ...(onboarded !== undefined ? { onboarded } : {}),
  }).where(eq(profiles.userId, user.id));

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const [row] = await db.select({ profile: profiles, gradeName: grades.name })
    .from(profiles).leftJoin(grades, eq(profiles.gradeId, grades.id))
    .where(eq(profiles.userId, user.id)).limit(1);
  return NextResponse.json({ profile: row?.profile, gradeName: row?.gradeName ?? null });
}
