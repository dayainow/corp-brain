import type { UserRole } from "@/lib/rbac";
import { isDocumentExpired } from "@/lib/audit/siem";
import { reciprocalRankFusion } from "@/lib/search/hybrid-core";
import { rerankCandidates } from "@/lib/search/reranker";
import { diversifyByFile } from "@/lib/search/file-diversity";
import { crossEncodeRerank } from "@/lib/search/cross-encoder";
import { config } from "@/lib/config";
import { JsonVectorStore } from "./json-store";
import { PgVectorStore } from "./pgvector-store";
import type { VectorStore } from "./interface";

let storeInstance: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!storeInstance) {
    storeInstance =
      config.vectorStore.type === "pgvector"
        ? new PgVectorStore()
        : new JsonVectorStore();
  }
  return storeInstance;
}

export function resetVectorStore(): void {
  storeInstance = null;
}

export async function hybridSearch(
  query: string,
  queryEmbedding: number[],
  topK: number = 5,
  userRole: string = "general"
): Promise<import("./types").VectorDocument[]> {
  const store = getVectorStore();
  const candidateLimit = Math.max(topK * 4, 20);

  const candidates = (
    await store.fetchSearchCandidates({
      query,
      queryEmbedding,
      userRole: userRole as UserRole,
      limit: candidateLimit,
    })
  ).filter((doc) => !isDocumentExpired(doc.metadata));

  if (candidates.length === 0) return [];

  const rrfScores = reciprocalRankFusion(candidates, query, queryEmbedding);
  const reranked = rerankCandidates(
    query,
    rrfScores.slice(0, candidateLimit).map((item) => ({
      document: item.document,
      rrfScore: item.score,
    })),
    candidateLimit
  );
  const crossReranked = await crossEncodeRerank(query, reranked);
  return diversifyByFile(crossReranked, topK).map((item) => item.document);
}

export async function saveVectors(docs: import("./types").VectorDocument[]): Promise<void> {
  await getVectorStore().saveAll(docs);
}

export { type VectorDocument } from "./types";
