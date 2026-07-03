#!/usr/bin/env tsx
/**
 * 임베딩 모델 A/B — e5-small vs ko-sroberta-multitask
 *
 * Usage:
 *   npm run eval:embedding-ab
 *   npm run eval:embedding-ab -- --models e5_small,ko_sroberta
 *   npm run eval:embedding-ab -- --write-report
 *
 * 선행: npm run index:vault (코퍼스 텍스트·메타데이터)
 */
import fs from "fs";
import path from "path";
import { resolveAbPresets } from "../src/lib/embeddings/models";
import { resetEmbeddingPipelines } from "../src/lib/embeddings";
import {
  loadCorpusTemplate,
  runEvalWithEmbeddingModel,
  type ModelEvalResult,
} from "../src/lib/search/eval-embedding-ab";

function parseModelsArg(): string[] | undefined {
  const idx = process.argv.indexOf("--models");
  if (idx === -1) return undefined;
  const raw = process.argv[idx + 1];
  if (!raw) throw new Error("--models 값이 필요합니다. 예: e5_small,ko_sroberta");
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function pickWinner(results: ModelEvalResult[]): ModelEvalResult | null {
  if (results.length === 0) return null;
  return [...results].sort((a, b) => {
    if (b.metrics.hitAt3 !== a.metrics.hitAt3) return b.metrics.hitAt3 - a.metrics.hitAt3;
    if (b.metrics.mrr !== a.metrics.mrr) return b.metrics.mrr - a.metrics.mrr;
    return b.metrics.hitAt1 - a.metrics.hitAt1;
  })[0];
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function buildMarkdown(results: ModelEvalResult[], winner: ModelEvalResult | null): string {
  const lines = [
    "# Embedding A/B 리포트",
    "",
    `> 생성: ${new Date().toISOString()}`,
    `> 코퍼스: \`npm run index:vault\` 기준 · eval: \`data/eval-queries.json\``,
    "",
    "## 결과",
    "",
    "| 모델 | Hit@1 | Hit@3 | MRR | 청크 | 임베딩(ms) |",
    "|------|-------|-------|-----|------|------------|",
  ];

  for (const r of results) {
    const label =
      winner?.spec.key === r.spec.key ? `**${r.spec.label}**` : r.spec.label;
    lines.push(
      `| ${label} | ${formatPct(r.metrics.hitAt1)} | ${formatPct(r.metrics.hitAt3)} | ${r.metrics.mrr.toFixed(3)} | ${r.chunkCount} | ${r.embedMs} |`
    );
  }

  lines.push("");
  if (winner) {
    lines.push(`**승자**: \`${winner.spec.id}\` (Hit@3 ${formatPct(winner.metrics.hitAt3)})`);
    lines.push("");
    lines.push("### 적용 방법 (승자 반영 시)");
    lines.push("");
    lines.push("```bash");
    lines.push(`EMBEDDING_MODEL=${winner.spec.id} npm run index:vault`);
    lines.push("# PgVector 운영 시: embedding 차원 확인 후 schema 마이그레이션 필요");
    lines.push("```");
  }

  lines.push("");
  lines.push("## 실패 문항 (모델별)");
  lines.push("");
  for (const r of results) {
    const misses = r.results.filter((x) => !x.hitAt3);
    lines.push(`### ${r.spec.label}`);
    if (misses.length === 0) {
      lines.push("_없음_");
    } else {
      for (const m of misses) {
        lines.push(`- "${m.query}" — 기대: ${m.expectedFiles.join(", ")} / 검색: ${m.retrievedFiles.join(", ")}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const presets = resolveAbPresets(parseModelsArg());
  const writeReport = process.argv.includes("--write-report");
  const template = await loadCorpusTemplate();

  console.log("Embedding A/B 평가");
  console.log(`코퍼스 청크: ${template.length} · 모델: ${presets.map((p) => p.label).join(" vs ")}\n`);

  const results: ModelEvalResult[] = [];

  for (const spec of presets) {
    console.log(`── ${spec.label} (${spec.id}) ──`);
    resetEmbeddingPipelines();

    const result = await runEvalWithEmbeddingModel(spec, {
      corpusTemplate: template,
      onEmbedProgress: (done, total) => {
        if (done % 20 === 0 || done === total) {
          process.stdout.write(`\r  임베딩 ${done}/${total}`);
        }
      },
    });
    process.stdout.write("\n");

    for (const r of result.results) {
      const status = r.hitAt3 ? "✓" : "✗";
      console.log(`  ${status} "${r.query}"`);
    }

    console.log(
      `  Hit@1 ${formatPct(result.metrics.hitAt1)} · Hit@3 ${formatPct(result.metrics.hitAt3)} · MRR ${result.metrics.mrr.toFixed(3)} · ${result.embedMs}ms\n`
    );
    results.push(result);
    resetEmbeddingPipelines();
  }

  console.log("=== 비교 ===");
  console.log("| 모델 | Hit@1 | Hit@3 | MRR |");
  console.log("|------|-------|-------|-----|");
  for (const r of results) {
    console.log(
      `| ${r.spec.label} | ${formatPct(r.metrics.hitAt1)} | ${formatPct(r.metrics.hitAt3)} | ${r.metrics.mrr.toFixed(3)} |`
    );
  }

  const winner = pickWinner(results);
  if (winner) {
    console.log(`\n승자: ${winner.spec.label} (${winner.spec.id})`);
  }

  if (writeReport) {
    const reportPath = path.join(process.cwd(), "docs/EMBEDDING_AB_REPORT.md");
    fs.writeFileSync(reportPath, `${buildMarkdown(results, winner)}\n`, "utf-8");
    console.log(`\n리포트 저장: ${reportPath}`);
  }

  const threshold = Number(process.env.EVAL_HIT3_THRESHOLD ?? "0.8");
  const bestHit3 = Math.max(...results.map((r) => r.metrics.hitAt3));
  if (bestHit3 < threshold) {
    console.error(`\nWARN: 최고 Hit@3 ${formatPct(bestHit3)} < ${(threshold * 100).toFixed(0)}%`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
