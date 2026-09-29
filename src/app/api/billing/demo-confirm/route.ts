import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, subscriptions } from "@/db/schema";
import { requireRole } from "@/lib/api-guard";
import { activatePremium } from "@/lib/billing";
import { isMpesaConfigured } from "@/lib/payments/mpesa";

const bodySchema = z.object({ paymentId: z.string().uuid() });

// POST /api/billing/demo-confirm — stands in for Safaricom's callback when
// Daraja isn't configured, so the upgrade flow is fully demoable without
// real merchant credentials. Refuses to run once Daraja IS configured, so it
// can never be used to fake a real payment.
export async function POST(req: Request) {
  const guard = await requireRole(["STUDENT", "PARENT"]);
  if ("error" in guard) return guard.error;
  if (isMpesaConfigured()) return NextResponse.json({ error: "Demo confirmation is disabled — real M-Pesa payments are configured." }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [payment] = await db.select().from(payments).where(eq(payments.id, parsed.data.paymentId)).limit(1);
  if (!payment || payment.payerId !== guard.session.user.id) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (payment.status !== "PENDING") return NextResponse.json({ error: "Payment already resolved." }, { status: 409 });

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, payment.subscriptionId)).limit(1);
  await db.update(payments).set({ status: "SUCCESS" }).where(eq(payments.id, payment.id));
  await activatePremium(sub.userId, payment.payerId);

  return NextResponse.json({ ok: true });
}
