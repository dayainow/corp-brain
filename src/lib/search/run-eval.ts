import fs from "fs";
import path from "path";
import { generateEmbedding } from "@/lib/embeddings";
import { hybridSearch } from "@/lib/vector-store";
import {
  evaluateQuery,
  aggregateMetrics,
  type EvalQuery,
  type EvalResult,
} from "./metrics";

import { resetCrossEncoderCache } from "./cross-encoder";

export interface EvalRunResult {
  metrics: ReturnType<typeof aggregateMetrics>;
  results: EvalResult[];
  passed: boolean;
  threshold: number;
}

export async function runEvalSearch(options?: {
  threshold?: number;
  evalPath?: string;
  /** 빈 문자열이면 cross-encoder 비활성 */
  crossEncoderModel?: string;
}): Promise<EvalRunResult> {
  const threshold = options?.threshold ?? Number(process.env.EVAL_HIT3_THRESHOLD ?? "0.8");
  const evalPath = options?.evalPath ?? path.join(process.cwd(), "data/eval-queries.json");
  const queries: EvalQuery[] = JSON.parse(await fs.promises.readFile(evalPath, "utf-8"));

  const prevCe = process.env.CROSS_ENCODER_MODEL;
  if (options?.crossEncoderModel !== undefined) {
    process.env.CROSS_ENCODER_MODEL = options.crossEncoderModel;
    resetCrossEncoderCache();
  }

  try {
    const results: EvalResult[] = [];
    for (const q of queries) {
      const embedding = await generateEmbedding(q.query);
      const docs = await hybridSearch(q.query, embedding, 5, q.role ?? "general");
      const retrievedFiles = [...new Set(docs.map((d) => d.metadata.fileName as string))];
      results.push(evaluateQuery(q, retrievedFiles));
    }

    const metrics = aggregateMetrics(results);
    return {
      metrics,
      results,
      passed: metrics.hitAt3 >= threshold,
      threshold,
    };
  } finally {
    if (options?.crossEncoderModel !== undefined) {
      if (prevCe === undefined) delete process.env.CROSS_ENCODER_MODEL;
      else process.env.CROSS_ENCODER_MODEL = prevCe;
      resetCrossEncoderCache();
    }
  }
}
