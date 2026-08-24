import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiConversations, aiMessages } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";

// GET /api/ai/conversation — the signed-in student's current Msingi AI
// conversation, so reloading /ai doesn't lose history.
export async function GET() {
  const guard = await requireRole(["STUDENT"]);
  if ("error" in guard) return guard.error;
  const userId = guard.session.user.id;

  const [conversation] = await db.select().from(aiConversations)
    .where(eq(aiConversations.userId, userId)).orderBy(desc(aiConversations.startedAt)).limit(1);
  if (!conversation) return NextResponse.json({ messages: [] });

  const messages = await db.select({ role: aiMessages.role, content: aiMessages.content })
    .from(aiMessages).where(eq(aiMessages.conversationId, conversation.id)).orderBy(asc(aiMessages.createdAt));

  return NextResponse.json({ messages });
}
