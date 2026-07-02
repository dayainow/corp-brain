import { extractMessageText, toModelMessages, type ModelMessage } from "@/lib/chat/messages";

const FOLLOW_UP_PATTERNS =
  /^(그|그거|그것|그건|이|이거|이것|저|저거|위|앞|다시|더|추가|예외|자세히|구체|얼마|언제|누가|어디|왜|어떻게)/;

const MAX_CONTEXT_TURNS = 3;
const MAX_QUERY_LENGTH = 500;

/**
 * Glean/Notion AI 스타일 멀티턴 검색 쿼리 구성.
 * 후속 질문(「그 규정에서 예외는?」)에 이전 대화 맥락을 붙여 standalone query로 만듭니다.
 */
export function buildSearchQuery(messages: unknown[]): string {
  const modelMessages = toModelMessages(messages);
  if (modelMessages.length === 0) return "";

  const latest = modelMessages[modelMessages.length - 1];
  if (latest.role !== "user") return latest.content;

  const query = latest.content.trim();
  if (!isFollowUpQuery(query) || modelMessages.length < 2) {
    return query;
  }

  const priorContext = extractPriorContext(modelMessages.slice(0, -1));
  if (!priorContext) return query;

  const combined = `${priorContext}\n\n현재 질문: ${query}`;
  return combined.length > MAX_QUERY_LENGTH
    ? combined.slice(-MAX_QUERY_LENGTH)
    : combined;
}

function isFollowUpQuery(query: string): boolean {
  if (query.length < 20) return true;
  return FOLLOW_UP_PATTERNS.test(query.trim());
}

function extractPriorContext(messages: ModelMessage[]): string | null {
  const recent = messages.slice(-MAX_CONTEXT_TURNS * 2);
  const parts: string[] = [];

  for (const message of recent) {
    if (message.role === "user") {
      parts.push(`사용자: ${truncate(message.content, 120)}`);
    } else if (message.role === "assistant") {
      const summary = truncate(stripCitations(message.content), 160);
      if (summary) parts.push(`어시스턴트: ${summary}`);
    }
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

function stripCitations(text: string): string {
  return text.replace(/\[출처:[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

/** UIMessage 배열에서 마지막 사용자 텍스트 (validateChatMessages 보조) */
export function getLatestUserText(messages: unknown[]): string | null {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  return extractMessageText(messages[messages.length - 1])?.trim() ?? null;
}
