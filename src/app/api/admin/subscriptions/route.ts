import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, users, profiles } from "@/db/schema";
import { requireRole } from "@/lib/api-guard";
import { activatePremium, getOrCreateSubscription } from "@/lib/billing";

// GET /api/admin/subscriptions — every learner's plan, for support/manual
// billing (e.g. a school paying offline rather than by M-Pesa).
export async function GET() {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;

  const rows = await db.select({
    userId: users.id, email: users.email, name: profiles.name,
    plan: subscriptions.plan, status: subscriptions.status, currentPeriodEnd: subscriptions.currentPeriodEnd,
  })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
    .where(eq(users.role, "STUDENT"));

  return NextResponse.json({ subscriptions: rows.map((r) => ({ ...r, plan: r.plan ?? "FREE", status: r.status ?? "ACTIVE" })) });
}

const bodySchema = z.object({ userId: z.string().uuid(), action: z.enum(["grant", "revoke"]) });

// POST /api/admin/subscriptions — manually grant or revoke Premium for a
// learner. The only "payment method" available until a real M-Pesa
// integration is wired up for schools/offline payers.
export async function POST(req: Request) {
  const guard = await requireRole(["ADMIN"]);
  if ("error" in guard) return guard.error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.action === "grant") {
    await activatePremium(parsed.data.userId, guard.session.user.id);
  } else {
    await getOrCreateSubscription(parsed.data.userId);
    await db.update(subscriptions).set({ plan: "FREE", status: "CANCELED", updatedAt: new Date() }).where(eq(subscriptions.userId, parsed.data.userId));
  }
  return NextResponse.json({ ok: true });
}
