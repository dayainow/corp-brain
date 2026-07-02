import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { generateEmbedding } from "@/lib/embeddings";
import { hybridSearch } from "@/lib/vector-store";
import { requireAuth } from "@/lib/auth/guard";
import { config } from "@/lib/config";
import { writeAuditLog, getClientIp } from "@/lib/audit";
import { checkRateLimit, denyRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateChatMessages } from "@/lib/chat/messages";
import { logError } from "@/lib/logger";

export const maxDuration = 30;

const ollama = createOpenAI({
  baseURL: config.ollama.baseURL,
  apiKey: config.ollama.apiKey,
});

function jsonError(message: string, status: number, code: string, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

export async function POST(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const userRole = session!.user.role;

  const rateKey = `chat:${session!.user.id}`;
  const rate = checkRateLimit(rateKey, { windowMs: 60_000, maxRequests: 20 });
  if (!rate.allowed) {
    return denyRateLimit(rate.resetAt);
  }

  try {
    const body = await req.json();
    const validation = validateChatMessages(body?.messages);
    if (!validation.ok) {
      return jsonError(validation.error, 400, validation.code);
    }

    const latestMessage = validation.text;
    const queryEmbedding = await generateEmbedding(latestMessage);
    const relevantDocs = await hybridSearch(
      latestMessage,
      queryEmbedding,
      config.rag.topK,
      userRole
    );

    const contextText = relevantDocs
      .map((doc) => `[Source: ${doc.metadata.fileName}]\n${doc.text}`)
      .join("\n\n---\n\n");

    const systemPrompt = `You are a helpful internal assistant for NovaPay (노바페이), a B2B payment and settlement platform company.
Use the following pieces of retrieved context to answer the user's question.
If you don't know the answer based on the context, just say that you don't know, don't try to make up an answer.
Always respond in Korean unless the user writes in another language.

CRITICAL INSTRUCTION FOR CITATIONS:
Whenever you use information from the context, you MUST cite the source using exactly this format: [출처: filename.md].
For example: "우리 회사의 휴가 규정에 따르면 연차는 15일입니다 [출처: vacation.md]."

Context:
${contextText}
`;

    await writeAuditLog({
      action: "chat.query",
      userId: session!.user.id,
      userEmail: session!.user.email,
      userRole,
      detail: {
        query: latestMessage.slice(0, 200),
        sourcesFound: relevantDocs.length,
        sources: relevantDocs.map((d) => d.metadata.fileName),
      },
      ip: getClientIp(req),
    });

    const result = streamText({
      model: ollama(config.ollama.model) as Parameters<typeof streamText>[0]["model"],
      system: systemPrompt,
      messages: body.messages,
    });

    const stream = result as unknown as Record<string, (() => Response) | undefined>;
    const rateHeaders = rateLimitHeaders(rate.remaining, rate.resetAt);

    if (typeof stream.toDataStreamResponse === "function") {
      const response = stream.toDataStreamResponse();
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
      return response;
    }
    if (typeof stream.toUIMessageStreamResponse === "function") {
      const response = stream.toUIMessageStreamResponse();
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
      return response;
    }
    if (typeof result.toTextStreamResponse === "function") {
      const response = result.toTextStreamResponse();
      Object.entries(rateHeaders).forEach(([key, value]) => response.headers.set(key, value));
      return response;
    }
    throw new Error("No suitable stream response method found.");
  } catch (err) {
    logError("chat.api", { err, userId: session!.user.id, path: "/api/chat" });
    return jsonError("Error processing chat request", 500, "CHAT_ERROR");
  }
}
