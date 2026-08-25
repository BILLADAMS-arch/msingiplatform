import { db } from "@/db";
import { notifications } from "@/db/schema";

export type NotificationType = "achievement" | "streak_milestone" | "assignment" | "test_result";

/** Writes one real notification row — never a fire-and-forget console log. */
export async function notify(userId: string, type: NotificationType, payload: Record<string, unknown>) {
  await db.insert(notifications).values({ userId, type, payload });
}
