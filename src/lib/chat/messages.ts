const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 4_000;

export interface ChatValidationResult {
  ok: true;
  text: string;
}

export interface ChatValidationError {
  ok: false;
  error: string;
  code: string;
}

export type ModelRole = "user" | "assistant" | "system";

export interface ModelMessage {
  role: ModelRole;
  content: string;
}

export function extractMessageText(message: unknown): string | null {
  if (!message || typeof message !== "object") return null;

  const record = message as Record<string, unknown>;

  if (Array.isArray(record.parts)) {
    const text = record.parts
      .filter((part): part is { type: string; text?: string } => {
        return typeof part === "object" && part !== null && (part as { type?: string }).type === "text";
      })
      .map((part) => part.text ?? "")
      .join("");
    return text || null;
  }

  if (typeof record.content === "string") {
    return record.content;
  }

  return null;
}

/** AI SDK UIMessage(parts) → streamText ModelMessage(content) 변환 */
export function toModelMessages(messages: unknown[]): ModelMessage[] {
  return messages
    .map((message) => {
      const record = message as Record<string, unknown>;
      const role = record.role;
      if (role !== "user" && role !== "assistant" && role !== "system") return null;

      const content = extractMessageText(message);
      if (!content?.trim()) return null;

      return { role, content: content.trim() };
    })
    .filter((message): message is ModelMessage => message !== null);
}

export function validateChatMessages(messages: unknown): ChatValidationResult | ChatValidationError {
  if (!Array.isArray(messages)) {
    return { ok: false, error: "messages must be an array", code: "INVALID_MESSAGES" };
  }

  if (messages.length === 0) {
    return { ok: false, error: "No message provided", code: "EMPTY_MESSAGES" };
  }

  if (messages.length > MAX_MESSAGES) {
    return { ok: false, error: "Too many messages in conversation", code: "MESSAGES_LIMIT" };
  }

  const text = extractMessageText(messages[messages.length - 1]);
  if (!text?.trim()) {
    return { ok: false, error: "No message provided", code: "EMPTY_MESSAGE" };
  }

  if (text.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: "Message too long", code: "MESSAGE_TOO_LONG" };
  }

  return { ok: true, text: text.trim() };
}
