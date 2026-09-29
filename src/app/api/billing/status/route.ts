import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-guard";
import { getOrCreateSubscription, isPremium, getAiMessagesToday, resolveLearner, AI_FREE_DAILY_LIMIT, PREMIUM_PRICE_KES } from "@/lib/billing";

// GET /api/billing/status?studentId= — the caller's own plan (STUDENT), or a
// linked child's plan (PARENT, via ?studentId=). Also reports today's free
// Msingi AI usage so the UI can show "3 of 5 free messages used today".
export async function GET(req: Request) {
  const guard = await requireRole(["STUDENT", "PARENT", "ADMIN"]);
  if ("error" in guard) return guard.error;

  const url = new URL(req.url);
  const studentId = url.searchParams.get("studentId");
  const learnerId = await resolveLearner(guard.session.user, studentId);
  if (!learnerId) return NextResponse.json({ error: "No learner specified, or not linked to you." }, { status: 403 });

  const sub = await getOrCreateSubscription(learnerId);
  const premium = await isPremium(learnerId);
  const aiUsedToday = await getAiMessagesToday(learnerId);

  return NextResponse.json({
    plan: premium ? "PREMIUM" : "FREE",
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    priceKes: PREMIUM_PRICE_KES,
    ai: { usedToday: aiUsedToday, dailyLimit: AI_FREE_DAILY_LIMIT, unlimited: premium },
  });
}
