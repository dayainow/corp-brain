import { requireAuth } from "@/lib/auth/guard";
import { writeAuditLog, getClientIp } from "@/lib/audit";
import { checkRateLimit, denyRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateChatMessages, toModelMessages } from "@/lib/chat/messages";
import { buildSearchQuery } from "@/lib/search/query-context";
import { retrieveRagContext, prepareUserMessages, streamRagResponse } from "@/lib/chat/rag";
import {
  buildRagSourceCards,
  type CorpBrainUIMessage,
} from "@/lib/chat/ui-message";
import { logError } from "@/lib/logger";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

export const maxDuration = 30;

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
  const rate = await checkRateLimit(rateKey, { windowMs: 60_000, maxRequests: 20 });
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
    const searchQuery = buildSearchQuery(body.messages);

    const modelMessages = toModelMessages(body.messages);
    if (modelMessages.length === 0) {
      return jsonError("No message provided", 400, "EMPTY_MESSAGE");
    }

    const stream = createUIMessageStream<CorpBrainUIMessage>({
      originalMessages: body.messages as CorpBrainUIMessage[],
      execute: async ({ writer }) => {
        writer.write({
          type: "data-rag-status",
          data: { phase: "searching" },
          transient: true,
        });

        const rag = await retrieveRagContext(searchQuery, latestMessage, userRole);

        await writeAuditLog({
          action: "chat.query",
          userId: session!.user.id,
          userEmail: session!.user.email,
          userRole,
          detail: {
            query: latestMessage.slice(0, 200),
            sourcesFound: rag.relevantDocs.length,
            sources: rag.sources,
          },
          ip: getClientIp(req),
        });

        writer.write({
          type: "data-rag-status",
          data: { phase: "generating" },
          transient: true,
        });

        writer.write({
          type: "data-rag-sources",
          id: "rag-sources",
          data: { sources: buildRagSourceCards(rag.relevantDocs) },
        });

        const result = streamRagResponse(
          rag.systemPrompt,
          prepareUserMessages(modelMessages)
        );
        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({
      stream,
      headers: rateLimitHeaders(rate.remaining, rate.resetAt),
    });
  } catch (err) {
    logError("chat.api", { err, userId: session!.user.id, path: "/api/chat" });
    return jsonError("Error processing chat request", 500, "CHAT_ERROR");
  }
}
