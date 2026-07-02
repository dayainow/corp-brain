import { generateText, streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { generateEmbedding } from "@/lib/embeddings";
import { hybridSearch } from "@/lib/vector-store";
import type { VectorDocument } from "@/lib/vector-store/types";
import { config } from "@/lib/config";
import type { UserRole } from "@/lib/rbac";
import type { ModelMessage } from "@/lib/chat/messages";

const ollama = createOpenAI({
  baseURL: config.ollama.baseURL,
  apiKey: config.ollama.apiKey,
});

export interface RagContext {
  searchQuery: string;
  latestMessage: string;
  relevantDocs: VectorDocument[];
  systemPrompt: string;
  sources: string[];
}

export async function retrieveRagContext(
  searchQuery: string,
  latestMessage: string,
  userRole: UserRole
): Promise<RagContext> {
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

  const systemPrompt = buildSystemPrompt(contextText);

  return {
    searchQuery,
    latestMessage,
    relevantDocs,
    systemPrompt,
    sources: [...new Set(relevantDocs.map((d) => d.metadata.fileName as string))],
  };
}

export function buildSystemPrompt(contextText: string): string {
  return `당신은 NovaPay(노바페이) 사내 지식 베이스 AI 어시스턴트입니다.

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

## Context
${contextText}`;
}

export function prepareUserMessages(messages: ModelMessage[]): ModelMessage[] {
  const prepared = messages.map((m) => ({ ...m }));
  const last = prepared[prepared.length - 1];
  if (last?.role === "user") {
    last.content = `${last.content}\n\n(반드시 한국어로 답변해 주세요.)`;
  }
  return prepared;
}

export function streamRagResponse(systemPrompt: string, messages: ModelMessage[]) {
  return streamText({
    model: ollama(config.ollama.model) as Parameters<typeof streamText>[0]["model"],
    system: systemPrompt,
    messages,
  });
}

/** Slack 등 비스트리밍 응답 */
export async function generateRagAnswer(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const result = await generateText({
    model: ollama(config.ollama.model) as Parameters<typeof generateText>[0]["model"],
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `${userMessage}\n\n(반드시 한국어로 답변해 주세요.)`,
      },
    ],
  });
  return result.text;
}
