import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, subscriptions } from "@/db/schema";
import { activatePremium } from "@/lib/billing";

type StkCallback = {
  Body: { stkCallback: { CheckoutRequestID: string; ResultCode: number; ResultDesc: string } };
};

// POST /api/billing/mpesa/callback — Safaricom's Daraja API posts here once
// the customer accepts or rejects the STK push (this URL is what
// MPESA_CALLBACK_URL points at). Not reachable in demo mode: it only ever
// fires for payments started through the real `initiateStkPush` path, which
// is itself gated on Daraja actually being configured. Always returns 200 —
// Daraja retries on anything else, and there's nothing useful a non-200
// response would tell it.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as StkCallback | null;
  const callback = body?.Body?.stkCallback;
  if (!callback) return NextResponse.json({ ok: true });

  const [payment] = await db.select().from(payments).where(eq(payments.providerRef, callback.CheckoutRequestID)).limit(1);
  if (!payment || payment.status !== "PENDING") return NextResponse.json({ ok: true });

  if (callback.ResultCode === 0) {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, payment.subscriptionId)).limit(1);
    await db.update(payments).set({ status: "SUCCESS" }).where(eq(payments.id, payment.id));
    await activatePremium(sub.userId, payment.payerId);
  } else {
    await db.update(payments).set({ status: "FAILED" }).where(eq(payments.id, payment.id));
  }

  return NextResponse.json({ ok: true });
}
