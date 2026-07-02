import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { generateEmbedding } from "@/lib/embeddings";
import { hybridSearch } from "@/lib/vector-store";
import { requireAuth } from "@/lib/auth/guard";
import { config } from "@/lib/config";
import { writeAuditLog, getClientIp } from "@/lib/audit";

export const maxDuration = 30;

const ollama = createOpenAI({
  baseURL: config.ollama.baseURL,
  apiKey: config.ollama.apiKey,
});

export async function POST(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const userRole = session!.user.role;

  try {
    const { messages } = await req.json();
    const latestMessage = messages[messages.length - 1]?.content;

    if (!latestMessage) {
      return new Response("No message provided", { status: 400 });
    }

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
      messages,
    });

    const stream = result as unknown as Record<string, (() => Response) | undefined>;
    if (typeof stream.toDataStreamResponse === "function") {
      return stream.toDataStreamResponse();
    }
    if (typeof stream.toUIMessageStreamResponse === "function") {
      return stream.toUIMessageStreamResponse();
    }
    if (typeof result.toTextStreamResponse === "function") {
      return result.toTextStreamResponse();
    }
    throw new Error("No suitable stream response method found.");
  } catch (err) {
    console.error("Chat API error:", err);
    return new Response("Error processing chat request", { status: 500 });
  }
}
