import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { generateEmbedding } from "@/lib/embeddings";
import { hybridSearch } from "@/lib/vector-store";
import { requireAuth } from "@/lib/auth/guard";
import { config } from "@/lib/config";
import { writeAuditLog, getClientIp } from "@/lib/audit";
import { checkRateLimit, denyRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validateChatMessages, toModelMessages } from "@/lib/chat/messages";
import { buildSearchQuery } from "@/lib/search/query-context";
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
    const searchQuery = buildSearchQuery(body.messages);
    const queryEmbedding = await generateEmbedding(searchQuery);
    const relevantDocs = await hybridSearch(
      searchQuery,
      queryEmbedding,
      config.rag.topK,
      userRole
    );

    const contextText = relevantDocs
      .map((doc) => `[Source: ${doc.metadata.fileName}]\n${doc.text}`)
      .join("\n\n---\n\n");

    const systemPrompt = `당신은 NovaPay(노바페이) 사내 지식 베이스 AI 어시스턴트입니다.

## 언어 규칙 (최우선)
- 모든 답변은 **반드시 한국어**로 작성하세요.
- 영어 문장, 영어 제목, 영어 불릿을 사용하지 마세요. (고유명사·파일명·[출처: ...] 형식만 예외)
- 사용자가 다른 언어로 질문해도 답변은 한국어로 하세요.

## 답변 규칙
- 아래 Context에 있는 사내 문서만 근거로 답변하세요.
- Context에 없으면 "해당 내용은 사내 문서에서 찾지 못했습니다"라고 답하세요. 추측하지 마세요.
- 답변은 간결하고 업무용 톤으로 작성하세요.

## 출처 인용 (필수)
- Context 정보를 사용할 때마다 반드시 이 형식으로 인용: [출처: filename.md]
- 예: "연차는 15일입니다 [출처: vacation.md]."

## Context
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

    const modelMessages = toModelMessages(body.messages);
    if (modelMessages.length === 0) {
      return jsonError("No message provided", 400, "EMPTY_MESSAGE");
    }

    const lastMessage = modelMessages[modelMessages.length - 1];
    if (lastMessage.role === "user") {
      lastMessage.content = `${lastMessage.content}\n\n(반드시 한국어로 답변해 주세요.)`;
    }

    const result = streamText({
      model: ollama(config.ollama.model) as Parameters<typeof streamText>[0]["model"],
      system: systemPrompt,
      messages: modelMessages,
    });

    const response = result.toUIMessageStreamResponse({
      headers: rateLimitHeaders(rate.remaining, rate.resetAt),
    });
    return response;
  } catch (err) {
    logError("chat.api", { err, userId: session!.user.id, path: "/api/chat" });
    return jsonError("Error processing chat request", 500, "CHAT_ERROR");
  }
}
