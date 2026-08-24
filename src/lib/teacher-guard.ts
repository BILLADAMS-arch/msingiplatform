import { NextResponse } from "next/server";
import { db } from "@/db";
import { classes } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Loads a class and verifies the caller owns it (or is an ADMIN). */
export async function requireOwnedClass(classId: string, userId: string, role: string) {
  const [classRow] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1);
  if (!classRow) return { error: NextResponse.json({ error: "Class not found" }, { status: 404 }) } as const;
  if (classRow.teacherId !== userId && role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Not your class" }, { status: 403 }) } as const;
  }
  return { classRow } as const;
}
