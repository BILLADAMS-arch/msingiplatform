import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { tests, subjects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

const bodySchema = z.object({
  subjectId: z.string().uuid(),
  title: z.string().min(1).max(160),
  type: z.enum(["quick", "standard", "revision", "full"]).default("standard"),
  passingThreshold: z.number().int().min(0).max(100).default(60),
  timeLimitSeconds: z.number().int().positive().optional(),
});

export async function GET() {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;

  const rows = await db.select({ test: tests, subjectName: subjects.name })
    .from(tests).innerJoin(subjects, eq(subjects.id, tests.subjectId)).orderBy(desc(tests.id));

  return NextResponse.json({
    tests: rows.map((r) => ({ id: r.test.id, title: r.test.title, type: r.test.type, published: r.test.published, subjectName: r.subjectName })),
  });
}

export async function POST(req: Request) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [test] = await db.insert(tests).values({ ...parsed.data, published: false }).returning();
  return NextResponse.json({ test }, { status: 201 });
}
