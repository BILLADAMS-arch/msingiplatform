import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { requireRole } from "@/lib/api-guard";
import { getOrCreateSubscription, resolveLearner, PREMIUM_PRICE_KES } from "@/lib/billing";
import { initiateStkPush, isMpesaConfigured } from "@/lib/payments/mpesa";

const bodySchema = z.object({ studentId: z.string().uuid().optional(), phone: z.string().min(9).max(15) });

// POST /api/billing/checkout — starts a Premium purchase for the caller
// (STUDENT) or a linked child (PARENT, via studentId). With real Daraja
// credentials configured this fires a genuine STK push to the given phone;
// otherwise it returns `demo: true` and the frontend drives a simulated
// confirmation via /api/billing/demo-confirm instead.
export async function POST(req: Request) {
  const guard = await requireRole(["STUDENT", "PARENT"]);
  if ("error" in guard) return guard.error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const learnerId = await resolveLearner(guard.session.user, parsed.data.studentId);
  if (!learnerId) return NextResponse.json({ error: "No learner specified, or not linked to you." }, { status: 403 });

  const sub = await getOrCreateSubscription(learnerId);
  const [payment] = await db.insert(payments).values({
    subscriptionId: sub.id, payerId: guard.session.user.id, provider: "MPESA",
    amountKes: PREMIUM_PRICE_KES, phone: parsed.data.phone, status: "PENDING",
  }).returning();

  if (!isMpesaConfigured()) {
    return NextResponse.json({ demo: true, paymentId: payment.id, message: "Demo mode — Daraja isn't configured yet, so no real charge will happen." });
  }

  try {
    const { checkoutRequestId } = await initiateStkPush({
      phone: parsed.data.phone, amountKes: PREMIUM_PRICE_KES,
      accountReference: `MSINGI-${learnerId.slice(0, 8)}`, description: "Msingi Premium — 30 days",
    });
    await db.update(payments).set({ providerRef: checkoutRequestId }).where(eq(payments.id, payment.id));
    return NextResponse.json({ demo: false, paymentId: payment.id, message: "Check your phone for the M-Pesa prompt." });
  } catch (err) {
    await db.update(payments).set({ status: "FAILED" }).where(eq(payments.id, payment.id));
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not start the M-Pesa payment." }, { status: 502 });
  }
}
