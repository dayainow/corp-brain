import type { UserRole } from "@/lib/rbac";
import { config } from "@/lib/config";
import { isDocumentExpired } from "@/lib/audit/siem";
import { rerankCandidates } from "@/lib/search/reranker";
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

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function keywordScore(query: string, text: string): number {
  const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return 0;
  const textLower = text.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    let pos = 0;
    while ((pos = textLower.indexOf(token, pos)) >= 0) {
      score += 1;
      pos += token.length;
    }
  }
  return score;
}

export async function hybridSearch(
  query: string,
  queryEmbedding: number[],
  topK: number = 5,
  userRole: string = "general"
): Promise<import("./types").VectorDocument[]> {
  const store = getVectorStore();
  const vectors = (await store.getAccessibleDocuments(userRole as UserRole))
    .filter((doc) => !isDocumentExpired(doc.metadata));
  if (vectors.length === 0) return [];

  const vecScores = vectors.map((doc, index) => ({
    index,
    score: cosineSimilarity(queryEmbedding, doc.embedding),
  }));
  vecScores.sort((a, b) => b.score - a.score);
  const vecRanks = new Array(vectors.length).fill(0);
  vecScores.forEach((item, rank) => { vecRanks[item.index] = rank + 1; });

  const kwScores = vectors.map((doc, index) => ({
    index,
    score: keywordScore(query, doc.text),
  }));
  kwScores.sort((a, b) => b.score - a.score);
  const kwRanks = new Array(vectors.length).fill(0);
  kwScores.forEach((item, rank) => { kwRanks[item.index] = rank + 1; });

  const k = 60;
  const rrfScores = vectors.map((doc, index) => ({
    document: doc,
    score: 1 / (k + vecRanks[index]) + 1 / (k + kwRanks[index]),
  }));
  rrfScores.sort((a, b) => b.score - a.score);

  const candidateCount = Math.min(topK * 4, rrfScores.length);
  const candidates = rrfScores.slice(0, candidateCount).map((item) => ({
    document: item.document,
    rrfScore: item.score,
  }));

  const reranked = rerankCandidates(query, candidates, topK);
  return reranked.map((item) => item.document);
}

export async function saveVectors(docs: import("./types").VectorDocument[]): Promise<void> {
  await getVectorStore().saveAll(docs);
}

export { type VectorDocument } from "./types";
