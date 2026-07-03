import fs from "fs";
import path from "path";
import { config } from "@/lib/config";
import { generateEmbedding } from "@/lib/embeddings";
import type { EmbeddingModelSpec } from "@/lib/embeddings/models";
import { hybridSearchInMemory } from "@/lib/search/hybrid-in-memory";
import {
  evaluateQuery,
  aggregateMetrics,
  type EvalQuery,
  type EvalResult,
} from "@/lib/search/metrics";
import type { VectorDocument } from "@/lib/vector-store/types";

export interface ModelEvalResult {
  spec: EmbeddingModelSpec;
  metrics: ReturnType<typeof aggregateMetrics>;
  results: EvalResult[];
  embedMs: number;
  chunkCount: number;
}

export async function loadCorpusTemplate(): Promise<VectorDocument[]> {
  const storePath = config.vectorStore.jsonPath;
  if (!fs.existsSync(storePath)) {
    throw new Error(
      `벡터 인덱스 없음: ${storePath} — 먼저 npm run index:vault 를 실행하세요.`
    );
  }
  const raw = JSON.parse(fs.readFileSync(storePath, "utf-8")) as VectorDocument[];
  return raw.map((doc) => ({ ...doc, embedding: [] }));
}

export async function embedCorpus(
  template: VectorDocument[],
  spec: EmbeddingModelSpec,
  onProgress?: (done: number, total: number) => void
): Promise<VectorDocument[]> {
  const embedded: VectorDocument[] = [];
  for (let i = 0; i < template.length; i++) {
    const doc = template[i];
    const vector = await generateEmbedding(doc.text, { model: spec.id });
    embedded.push({ ...doc, embedding: vector });
    onProgress?.(i + 1, template.length);
  }
  return embedded;
}

export async function runEvalWithEmbeddingModel(
  spec: EmbeddingModelSpec,
  options?: {
    evalPath?: string;
    corpusTemplate?: VectorDocument[];
    onEmbedProgress?: (done: number, total: number) => void;
  }
): Promise<ModelEvalResult> {
  const evalPath = options?.evalPath ?? path.join(process.cwd(), "data/eval-queries.json");
  const queries: EvalQuery[] = JSON.parse(fs.readFileSync(evalPath, "utf-8"));
  const template = options?.corpusTemplate ?? (await loadCorpusTemplate());

  const embedStart = Date.now();
  const corpus = await embedCorpus(template, spec, options?.onEmbedProgress);
  const embedMs = Date.now() - embedStart;

  const results: EvalResult[] = [];
  for (const q of queries) {
    const embedding = await generateEmbedding(q.query, { model: spec.id });
    const docs = await hybridSearchInMemory(
      corpus,
      q.query,
      embedding,
      5,
      (q.role ?? "general") as import("@/lib/rbac").UserRole
    );
    const retrievedFiles = [...new Set(docs.map((d) => d.metadata.fileName as string))];
    results.push(evaluateQuery(q, retrievedFiles));
  }

  return {
    spec,
    metrics: aggregateMetrics(results),
    results,
    embedMs,
    chunkCount: corpus.length,
  };
}
