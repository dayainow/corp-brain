import type { UIMessage } from "ai";
import type { VectorDocument } from "@/lib/vector-store/types";

export type RagStreamPhase = "searching" | "generating";

export interface RagSourceCard {
  fileName: string;
  displayName: string;
  snippet: string;
  /** RAG 검색 청크 전문 — 원문 하이라이트용 */
  chunkText: string;
}

export type CorpBrainUIMessage = UIMessage<
  never,
  {
    "rag-status": { phase: RagStreamPhase };
    "rag-sources": { sources: RagSourceCard[] };
  }
>;

export function displaySourceName(fileName: string): string {
  return fileName.replace(/\.(md|pdf|docx)$/i, "");
}

export function buildRagSourceCards(docs: VectorDocument[]): RagSourceCard[] {
  const byFile = new Map<string, string>();

  for (const doc of docs) {
    const fileName = String(doc.metadata.fileName ?? "");
    if (!fileName || byFile.has(fileName)) continue;
    byFile.set(fileName, doc.text);
  }

  return [...byFile.entries()].map(([fileName, chunkText]) => ({
    fileName,
    displayName: displaySourceName(fileName),
    snippet: chunkText.replace(/\s+/g, " ").trim().slice(0, 120),
    chunkText,
  }));
}

export function buildSourceHighlightMap(
  sources: RagSourceCard[]
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const source of sources) {
    map[source.fileName] = source.chunkText;
  }
  return map;
}

export function extractRagSourcesFromParts(
  parts: CorpBrainUIMessage["parts"] | undefined
): RagSourceCard[] {
  if (!parts?.length) return [];

  for (const part of parts) {
    if (part.type === "data-rag-sources" && part.data?.sources?.length) {
      return part.data.sources;
    }
  }

  return [];
}
