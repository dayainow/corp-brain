import fs from "fs";
import path from "path";

export interface VectorDocument {
  id: string; // e.g. chunk ID
  text: string;
  metadata: {
    source: string; // File path or title
    [key: string]: any;
  };
  embedding: number[];
}

const VECTOR_STORE_PATH = path.join(process.cwd(), "src", "data", "vectors.json");

// Read all vectors from the local JSON file
export async function loadVectors(): Promise<VectorDocument[]> {
  try {
    if (!fs.existsSync(VECTOR_STORE_PATH)) {
      return [];
    }
    const data = await fs.promises.readFile(VECTOR_STORE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load vectors", error);
    return [];
  }
}

// Save vectors to the local JSON file
export async function saveVectors(vectors: VectorDocument[]): Promise<void> {
  try {
    const dir = path.dirname(VECTOR_STORE_PATH);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(VECTOR_STORE_PATH, JSON.stringify(vectors, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save vectors", error);
  }
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Search for the top K most similar vectors
export async function similaritySearch(queryEmbedding: number[], topK: number = 5): Promise<VectorDocument[]> {
  const vectors = await loadVectors();
  if (vectors.length === 0) return [];

  const scoredVectors = vectors.map((doc) => {
    return {
      document: doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    };
  });

  // Sort by highest score first
  scoredVectors.sort((a, b) => b.score - a.score);

  return scoredVectors.slice(0, topK).map(sv => sv.document);
}

// Simple Token-based Keyword Scoring for Hybrid Search
function keywordScore(query: string, text: string): number {
  const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  if (tokens.length === 0) return 0;
  
  const textLower = text.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    let pos = 0;
    while (true) {
      pos = textLower.indexOf(token, pos);
      if (pos >= 0) {
        score += 1;
        pos += token.length;
      } else {
        break;
      }
    }
  }
  return score;
}

// Hybrid Search using Reciprocal Rank Fusion (RRF) with RBAC
export async function hybridSearch(query: string, queryEmbedding: number[], topK: number = 5, userRole: string = "general"): Promise<VectorDocument[]> {
  let vectors = await loadVectors();
  if (vectors.length === 0) return [];

  // RBAC Filtering: Admin sees all. Others see 'general' and their specific role.
  vectors = vectors.filter(doc => {
    const docRole = doc.metadata.role || 'general';
    if (userRole === 'admin') return true;
    return docRole === 'general' || docRole === userRole;
  });

  if (vectors.length === 0) return [];

  // 1. Vector Scoring & Ranking
  const vecScores = vectors.map((doc, index) => ({
    index,
    score: cosineSimilarity(queryEmbedding, doc.embedding),
  }));
  vecScores.sort((a, b) => b.score - a.score);
  const vecRanks = new Array(vectors.length).fill(0);
  vecScores.forEach((item, rank) => {
    vecRanks[item.index] = rank + 1;
  });

  // 2. Keyword Scoring & Ranking
  const kwScores = vectors.map((doc, index) => ({
    index,
    score: keywordScore(query, doc.text),
  }));
  kwScores.sort((a, b) => b.score - a.score);
  const kwRanks = new Array(vectors.length).fill(0);
  kwScores.forEach((item, rank) => {
    kwRanks[item.index] = rank + 1;
  });

  // 3. RRF (Reciprocal Rank Fusion)
  const k = 60;
  const rrfScores = vectors.map((doc, index) => {
    const rrfScore = (1 / (k + vecRanks[index])) + (1 / (k + kwRanks[index]));
    return {
      document: doc,
      score: rrfScore,
      vecRank: vecRanks[index],
      kwRank: kwRanks[index],
    };
  });

  // Sort by RRF score descending
  rrfScores.sort((a, b) => b.score - a.score);

  return rrfScores.slice(0, topK).map(item => item.document);
}
