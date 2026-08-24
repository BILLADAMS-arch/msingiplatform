import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { aiConversations, aiMessages, mistakes, questions, questionOptions, topics, profiles, grades } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { requireRole } from "@/lib/api-guard";
import { createGroqClient, TUTOR_MODEL } from "@/lib/ai/groq";
import { buildSystemPrompt, buildMistakeContext, MAX_HISTORY_MESSAGES } from "@/lib/ai/tutor";

const bodySchema = z.object({
  message: z.string().min(1).max(2000).optional(),
  mistakeId: z.string().uuid().optional(),
}).refine((b) => b.message || b.mistakeId, { message: "message or mistakeId is required" });

// POST /api/ai/chat — the ONLY place Msingi AI is called. Streams the tutor's
// reply back as plain text and persists both sides of the turn once it's
// resolved, so the conversation survives a page reload.
export async function POST(req: Request) {
  const guard = await requireRole(["STUDENT"]);
  if ("error" in guard) return guard.error;
  const userId = guard.session.user.id;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { mistakeId } = parsed.data;

  const userVisibleMessage = parsed.data.message ?? "Why is my answer wrong?";
  let mistakeContextBlock: string | null = null;

  if (mistakeId) {
    const [mistake] = await db.select().from(mistakes).where(eq(mistakes.id, mistakeId)).limit(1);
    if (!mistake || mistake.userId !== userId) return NextResponse.json({ error: "Mistake not found" }, { status: 404 });

    const [question] = await db.select().from(questions).where(eq(questions.id, mistake.questionId)).limit(1);
    const [topic] = await db.select().from(topics).where(eq(topics.id, mistake.topicId)).limit(1);
    const options = await db.select().from(questionOptions).where(eq(questionOptions.questionId, mistake.questionId));
    const chosen = options.find((o) => o.id === mistake.chosenOptionId);
    const correct = options.find((o) => o.isCorrect);

    if (question && topic && correct) {
      mistakeContextBlock = buildMistakeContext({
        prompt: question.prompt, chosenLabel: chosen?.label ?? null, correctLabel: correct.label,
        explanation: question.explanation, topicName: topic.name,
      });
    }
  }

  const [profile] = await db.select({ gradeName: grades.name }).from(profiles)
    .leftJoin(grades, eq(grades.id, profiles.gradeId)).where(eq(profiles.userId, userId)).limit(1);

  let [conversation] = await db.select().from(aiConversations).where(eq(aiConversations.userId, userId)).orderBy(desc(aiConversations.startedAt)).limit(1);
  if (!conversation) {
    [conversation] = await db.insert(aiConversations).values({ userId }).returning();
  }

  await db.insert(aiMessages).values({ conversationId: conversation.id, role: "user", content: userVisibleMessage });

  const history = await db.select().from(aiMessages).where(eq(aiMessages.conversationId, conversation.id)).orderBy(asc(aiMessages.createdAt));
  const recent = history.slice(-MAX_HISTORY_MESSAGES);

  const systemPrompt = buildSystemPrompt(profile?.gradeName ?? null) + (mistakeContextBlock ? `\n\n${mistakeContextBlock}` : "");

  const groq = createGroqClient();
  const groqStream = await groq.chat.completions.create({
    model: TUTOR_MODEL,
    max_tokens: 4096,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      ...recent.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ],
  });

  const encoder = new TextEncoder();
  let full = "";
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of groqStream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            full += delta;
            controller.enqueue(encoder.encode(delta));
          }
        }
      } catch (err) {
        controller.error(err);
        return;
      }
      if (full) {
        await db.insert(aiMessages).values({ conversationId: conversation.id, role: "assistant", content: full });
      }
      controller.close();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
