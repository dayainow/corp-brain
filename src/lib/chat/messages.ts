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

  const text = extractLatestUserText(messages[messages.length - 1]);
  if (!text?.trim()) {
    return { ok: false, error: "No message provided", code: "EMPTY_MESSAGE" };
  }

  if (text.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: "Message too long", code: "MESSAGE_TOO_LONG" };
  }

  return { ok: true, text: text.trim() };
}

function extractLatestUserText(message: unknown): string | null {
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
