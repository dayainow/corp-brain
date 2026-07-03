#!/usr/bin/env tsx
/**
 * Cross-encoder A/B — heuristic-only vs ms-marco cross-encoder
 *
 * Usage:
 *   npm run eval:cross-encoder-ab
 *   npm run eval:cross-encoder-ab -- --write-report
 *
 * 선행: npm run index:vault
 */
import fs from "fs";
import path from "path";
import { runEvalSearch } from "../src/lib/search/run-eval";

const DEFAULT_CE_MODEL =
  process.env.CROSS_ENCODER_AB_MODEL ?? "cross-encoder/ms-marco-MiniLM-L-6-v2";

interface Variant {
  key: string;
  label: string;
  crossEncoderModel: string;
}

const VARIANTS: Variant[] = [
  { key: "off", label: "Heuristic only (CE off)", crossEncoderModel: "" },
  { key: "on", label: `Cross-encoder (${DEFAULT_CE_MODEL})`, crossEncoderModel: DEFAULT_CE_MODEL },
];

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function pickWinner(
  results: { variant: Variant; hitAt3: number; mrr: number; hitAt1: number }[]
) {
  return [...results].sort((a, b) => {
    if (b.hitAt3 !== a.hitAt3) return b.hitAt3 - a.hitAt3;
    if (b.mrr !== a.mrr) return b.mrr - a.mrr;
    return b.hitAt1 - a.hitAt1;
  })[0];
}

function buildMarkdown(
  rows: {
    variant: Variant;
    hitAt1: number;
    hitAt3: number;
    mrr: number;
    misses: string[];
  }[],
  winner: (typeof rows)[0] | undefined
): string {
  const lines = [
    "# Cross-encoder A/B 리포트",
    "",
    `> 생성: ${new Date().toISOString()}`,
    `> 선행: \`npm run index:vault\` · eval: \`data/eval-queries.json\``,
    "",
    "## 결과",
    "",
    "| 변형 | Hit@1 | Hit@3 | MRR |",
    "|------|-------|-------|-----|",
  ];

  for (const r of rows) {
    const label = winner?.variant.key === r.variant.key ? `**${r.variant.label}**` : r.variant.label;
    lines.push(
      `| ${label} | ${formatPct(r.hitAt1)} | ${formatPct(r.hitAt3)} | ${r.mrr.toFixed(3)} |`
    );
  }

  lines.push("");
  if (winner) {
    lines.push(`**승자**: ${winner.variant.label}`);
    lines.push("");
    lines.push("### 적용 (승자가 CE on일 때)");
    lines.push("");
    lines.push("```bash");
    lines.push(`CROSS_ENCODER_MODEL=${DEFAULT_CE_MODEL} npm run dev:quality`);
    lines.push("# 또는 .env.local / compose.host.env 에 설정");
    lines.push("```");
  }

  lines.push("");
  lines.push("## Hit@3 미스 (변형별)");
  for (const r of rows) {
    lines.push("");
    lines.push(`### ${r.variant.label}`);
    if (r.misses.length === 0) lines.push("_없음_");
    else r.misses.forEach((m) => lines.push(`- ${m}`));
  }

  return lines.join("\n");
}

async function main() {
  const writeReport = process.argv.includes("--write-report");
  console.log("Cross-encoder A/B 평가\n");

  const rows: {
    variant: Variant;
    hitAt1: number;
    hitAt3: number;
    mrr: number;
    misses: string[];
  }[] = [];

  for (const variant of VARIANTS) {
    console.log(`── ${variant.label} ──`);
    const { metrics, results } = await runEvalSearch({
      crossEncoderModel: variant.crossEncoderModel,
    });

    const misses = results
      .filter((r) => !r.hitAt3)
      .map((r) => `"${r.query}" — 기대: ${r.expectedFiles.join(", ")}`);

    console.log(
      `  Hit@1 ${formatPct(metrics.hitAt1)} · Hit@3 ${formatPct(metrics.hitAt3)} · MRR ${metrics.mrr.toFixed(3)}\n`
    );

    rows.push({
      variant,
      hitAt1: metrics.hitAt1,
      hitAt3: metrics.hitAt3,
      mrr: metrics.mrr,
      misses,
    });
  }

  console.log("=== 비교 ===");
  console.log("| 변형 | Hit@1 | Hit@3 | MRR |");
  console.log("|------|-------|-------|-----|");
  for (const r of rows) {
    console.log(
      `| ${r.variant.key} | ${formatPct(r.hitAt1)} | ${formatPct(r.hitAt3)} | ${r.mrr.toFixed(3)} |`
    );
  }

  const winner = pickWinner(rows);
  if (winner) {
    console.log(`\n승자: ${winner.variant.label}`);
  }

  if (writeReport) {
    const reportPath = path.join(process.cwd(), "docs/CROSS_ENCODER_AB_REPORT.md");
    fs.writeFileSync(reportPath, `${buildMarkdown(rows, winner)}\n`, "utf-8");
    console.log(`\n리포트 저장: ${reportPath}`);
  }

  const off = rows.find((r) => r.variant.key === "off");
  const on = rows.find((r) => r.variant.key === "on");
  if (off && on && on.hitAt3 < off.hitAt3) {
    console.warn(
      `\nWARN: Cross-encoder Hit@3 ${formatPct(on.hitAt3)} < baseline ${formatPct(off.hitAt3)} — CE 비활성 유지 권장`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
