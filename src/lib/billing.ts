import { db } from "@/db";
import { subscriptions, aiConversations, aiMessages, parentChildren } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";

type Role = "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";

/**
 * Resolves which learner account a billing request is about: a STUDENT is
 * always paying for themselves; a PARENT must name a linked child via
 * `studentId` (and can only act on a child actually linked to them).
 * Returns null if the caller isn't allowed to act on the requested learner.
 */
export async function resolveLearner(caller: { id: string; role: Role }, studentId?: string | null): Promise<string | null> {
  if (caller.role === "STUDENT") return caller.id;
  if (caller.role === "ADMIN" && studentId) return studentId;
  if (caller.role === "PARENT") {
    if (!studentId) return null;
    const [link] = await db.select().from(parentChildren)
      .where(and(eq(parentChildren.parentId, caller.id), eq(parentChildren.childId, studentId))).limit(1);
    return link ? studentId : null;
  }
  return null;
}

/** Free-tier learners get this many Msingi AI messages per UTC day. */
export const AI_FREE_DAILY_LIMIT = 5;
export const PREMIUM_PRICE_KES = 300;
export const PREMIUM_PERIOD_DAYS = 30;

/** Every learner has exactly one subscription row — FREE by default, created lazily on first check. */
export async function getOrCreateSubscription(userId: string) {
  const [existing] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(subscriptions).values({ userId, payerId: userId }).onConflictDoNothing().returning();
  if (created) return created;
  // Lost a race with a concurrent request — the row now exists, fetch it.
  const [row] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return row;
}

export async function isPremium(userId: string): Promise<boolean> {
  const sub = await getOrCreateSubscription(userId);
  if (sub.plan !== "PREMIUM" || sub.status !== "ACTIVE") return false;
  if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() < Date.now()) return false;
  return true;
}

/** How many Msingi AI messages this learner has sent today (UTC), for free-tier quota enforcement. */
export async function getAiMessagesToday(userId: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const [row] = await db.select({ count: sql<number>`count(*)` })
    .from(aiMessages)
    .innerJoin(aiConversations, eq(aiConversations.id, aiMessages.conversationId))
    .where(and(eq(aiConversations.userId, userId), eq(aiMessages.role, "user"), gte(aiMessages.createdAt, todayStart)));
  return Number(row?.count ?? 0);
}

/** Activates Premium for `userId` for one billing period, paid by `payerId`. */
export async function activatePremium(userId: string, payerId: string) {
  const periodEnd = new Date(Date.now() + PREMIUM_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  await getOrCreateSubscription(userId);
  await db.update(subscriptions)
    .set({ plan: "PREMIUM", status: "ACTIVE", payerId, currentPeriodEnd: periodEnd, updatedAt: new Date() })
    .where(eq(subscriptions.userId, userId));
}
