import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, profiles, grades } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createAdminClient } from "@/lib/supabase/admin";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).max(120),
  role: z.enum(["STUDENT", "TEACHER", "PARENT"]).default("STUDENT"), // admins are provisioned, not self-registered
  gradeName: z.string().optional(), // required for students, e.g. "Grade 7"
  goal: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password, name, role, gradeName, goal } = parsed.data;

  const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  let gradeId: string | undefined;
  if (role === "STUDENT") {
    if (!gradeName) {
      return NextResponse.json({ error: "Grade is required for student accounts." }, { status: 400 });
    }
    const [grade] = await db.select().from(grades).where(eq(grades.name, gradeName)).limit(1);
    if (!grade) return NextResponse.json({ error: `Unknown grade: ${gradeName}` }, { status: 400 });
    gradeId = grade.id;
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true,
    app_metadata: { role },
  });
  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message || "Could not create account." }, { status: 400 });
  }

  try {
    const [user] = await db.insert(users).values({
      id: created.user.id,
      email: email.toLowerCase(),
      role,
    }).returning();

    await db.insert(profiles).values({
      userId: user.id,
      name,
      gradeId,
      goal,
      onboarded: role === "STUDENT" ? false : true,
    });

    return NextResponse.json({ id: user.id, email: user.email, role: user.role }, { status: 201 });
  } catch (err) {
    // Roll back the Supabase Auth user so a failed profile insert doesn't
    // leave an orphaned account the person can never register again with.
    await admin.auth.admin.deleteUser(created.user.id);
    throw err;
  }
}
