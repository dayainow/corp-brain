/**
 * RAG 검색 품질 평가 스크립트
 * Usage: npm run eval:search
 */
import { runEvalSearch } from "../src/lib/search/run-eval";

async function main() {
  const { metrics, results, passed, threshold } = await runEvalSearch();

  console.log(`검색 품질 평가 시작: ${results.length}개 질문\n`);

  for (const result of results) {
    const status = result.hitAt3 ? "✓" : "✗";
    console.log(`${status} "${result.query}"`);
    console.log(`   기대: ${result.expectedFiles.join(", ")}`);
    console.log(`   검색: ${result.retrievedFiles.join(", ")}\n`);
  }

  console.log("=== 결과 ===");
  console.log(`Hit@1: ${(metrics.hitAt1 * 100).toFixed(1)}%`);
  console.log(`Hit@3: ${(metrics.hitAt3 * 100).toFixed(1)}%`);
  console.log(`MRR:   ${metrics.mrr.toFixed(3)}`);

  if (!passed) {
    console.error(
      `\nFAIL: Hit@3 ${(metrics.hitAt3 * 100).toFixed(1)}% < ${(threshold * 100).toFixed(0)}%`
    );
    process.exit(1);
  }
  console.log(`\nPASS: Hit@3 ≥ ${(threshold * 100).toFixed(0)}%`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
