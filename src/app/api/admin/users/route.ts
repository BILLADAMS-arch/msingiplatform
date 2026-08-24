import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, profiles, grades } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// GET /api/admin/users — every user, with profile name/grade, for the admin console.
export async function GET() {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;

  const rows = await db.select({ user: users, profile: profiles, gradeName: grades.name })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(grades, eq(grades.id, profiles.gradeId))
    .orderBy(desc(users.createdAt));

  return NextResponse.json({
    users: rows.map((r) => ({
      id: r.user.id, email: r.user.email, role: r.user.role, createdAt: r.user.createdAt,
      name: r.profile?.name ?? null, gradeName: r.gradeName ?? null,
    })),
  });
}
