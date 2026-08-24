import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { parentChildren, users, profiles, grades } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({ email: z.string().email() });

// GET — the parent's linked children, name/grade only.
export async function GET() {
  const guard = await requireRole(["PARENT", "ADMIN"]);
  if ("error" in guard) return guard.error;

  const rows = await db.select({ id: users.id, name: profiles.name, gradeName: grades.name })
    .from(parentChildren)
    .innerJoin(users, eq(users.id, parentChildren.childId))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(grades, eq(grades.id, profiles.gradeId))
    .where(eq(parentChildren.parentId, guard.session.user.id));

  return NextResponse.json({ children: rows });
}

// POST — links an existing STUDENT account by email (no consent step in this build).
export async function POST(req: Request) {
  const guard = await requireRole(["PARENT", "ADMIN"]);
  if ("error" in guard) return guard.error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [child] = await db.select().from(users).where(eq(users.email, parsed.data.email.toLowerCase())).limit(1);
  if (!child || child.role !== "STUDENT") return NextResponse.json({ error: "No student account with that email." }, { status: 404 });

  await db.insert(parentChildren).values({ parentId: guard.session.user.id, childId: child.id }).onConflictDoNothing();
  return NextResponse.json({ ok: true }, { status: 201 });
}
