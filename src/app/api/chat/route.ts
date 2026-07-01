import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { generateEmbedding } from "@/lib/embeddings";
import { similaritySearch, hybridSearch } from "@/lib/vector-store";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Configure to use local Ollama through OpenAI compatible endpoint
const ollama = createOpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama", // Dummy key
});

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const role = url.searchParams.get("role") || "general";
    const { messages } = await req.json();
    const latestMessage = messages[messages.length - 1]?.content;

    if (!latestMessage) {
      return new Response("No message provided", { status: 400 });
    }

    // 1. Generate embedding for user query
    console.log(`Generating embedding for user query (Role: ${role})...`);
    const queryEmbedding = await generateEmbedding(latestMessage);

    // 2. Search for relevant context (Hybrid Search with RBAC)
    console.log("Searching for relevant context using Hybrid Search...");
    const relevantDocs = await hybridSearch(latestMessage, queryEmbedding, 5, role); // top 5
    
    // 3. Build context string
    const contextText = relevantDocs
      .map((doc, i) => `[Source: ${doc.metadata.fileName}]\n${doc.text}`)
      .join("\n\n---\n\n");

    console.log(`Found ${relevantDocs.length} relevant documents.`);

    // 4. Construct system prompt
    const systemPrompt = `You are a helpful company internal assistant.
Use the following pieces of retrieved context to answer the user's question. 
If you don't know the answer based on the context, just say that you don't know, don't try to make up an answer.

CRITICAL INSTRUCTION FOR CITATIONS:
Whenever you use information from the context, you MUST cite the source using exactly this format: [출처: filename.md].
For example: "우리 회사의 휴가 규정에 따르면 연차는 15일입니다 [출처: vacation.md]."

Context:
${contextText}
`;

    // 5. Call Ollama with stream
    const result = streamText({
      model: ollama("llama3") as any,
      system: systemPrompt,
      messages,
    });

    console.log("Checking AI SDK stream methods...");

    // Fallback based on which method is available in the installed SDK version
    if (typeof (result as any).toDataStreamResponse === 'function') {
      return (result as any).toDataStreamResponse();
    } else if (typeof (result as any).toUIMessageStreamResponse === 'function') {
      return (result as any).toUIMessageStreamResponse();
    } else if (typeof (result as any).toAIStreamResponse === 'function') {
      return (result as any).toAIStreamResponse();
    } else if (typeof result.toTextStreamResponse === 'function') {
      console.warn("Fallback to TextStreamResponse. Frontend must use basic text parsing.");
      return result.toTextStreamResponse();
    } else {
      throw new Error("No suitable stream response method found on result object.");
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Error processing chat request", { status: 500 });
  }
}
