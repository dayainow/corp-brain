import type { VectorDocument } from "@/lib/vector-store/types";

const RRF_K = 60;

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function keywordScore(query: string, text: string): number {
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

export function reciprocalRankFusion(
  vectors: VectorDocument[],
  query: string,
  queryEmbedding: number[]
): { document: VectorDocument; score: number }[] {
  if (vectors.length === 0) return [];

  const vecScores = vectors.map((doc, index) => ({
    index,
    score: cosineSimilarity(queryEmbedding, doc.embedding),
  }));
  vecScores.sort((a, b) => b.score - a.score);
  const vecRanks = new Array(vectors.length).fill(0);
  vecScores.forEach((item, rank) => {
    vecRanks[item.index] = rank + 1;
  });

  const kwScores = vectors.map((doc, index) => ({
    index,
    score: keywordScore(query, doc.text),
  }));
  kwScores.sort((a, b) => b.score - a.score);
  const kwRanks = new Array(vectors.length).fill(0);
  kwScores.forEach((item, rank) => {
    kwRanks[item.index] = rank + 1;
  });

  return vectors
    .map((doc, index) => ({
      document: doc,
      score: 1 / (RRF_K + vecRanks[index]) + 1 / (RRF_K + kwRanks[index]),
    }))
    .sort((a, b) => b.score - a.score);
}
