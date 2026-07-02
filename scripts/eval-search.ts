/**
 * RAG 검색 품질 평가 스크립트
 * Usage: npm run eval:search
 */
import fs from "fs";
import path from "path";
import { generateEmbedding } from "../src/lib/embeddings";
import { hybridSearch } from "../src/lib/vector-store";
import {
  evaluateQuery,
  aggregateMetrics,
  type EvalQuery,
} from "../src/lib/search/metrics";

async function main() {
  const evalPath = path.join(process.cwd(), "data/eval-queries.json");
  const queries: EvalQuery[] = JSON.parse(
    await fs.promises.readFile(evalPath, "utf-8")
  );

  console.log(`검색 품질 평가 시작: ${queries.length}개 질문\n`);

  const results = [];
  for (const q of queries) {
    const embedding = await generateEmbedding(q.query);
    const docs = await hybridSearch(q.query, embedding, 5, q.role ?? "general");
    const retrievedFiles = [...new Set(docs.map((d) => d.metadata.fileName as string))];
    const result = evaluateQuery(q, retrievedFiles);
    results.push(result);

    const status = result.hitAt3 ? "✓" : "✗";
    console.log(`${status} "${q.query}"`);
    console.log(`   기대: ${q.expectedFiles.join(", ")}`);
    console.log(`   검색: ${retrievedFiles.join(", ")}\n`);
  }

  const agg = aggregateMetrics(results);
  console.log("=== 결과 ===");
  console.log(`Hit@1: ${(agg.hitAt1 * 100).toFixed(1)}%`);
  console.log(`Hit@3: ${(agg.hitAt3 * 100).toFixed(1)}%`);
  console.log(`MRR:   ${agg.mrr.toFixed(3)}`);

  const threshold = Number(process.env.EVAL_HIT3_THRESHOLD ?? "0.5");
  if (agg.hitAt3 < threshold) {
    console.error(`\nFAIL: Hit@3 ${(agg.hitAt3 * 100).toFixed(1)}% < ${(threshold * 100).toFixed(0)}%`);
    process.exit(1);
  }
  console.log(`\nPASS: Hit@3 ≥ ${(threshold * 100).toFixed(0)}%`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
