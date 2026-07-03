#!/usr/bin/env tsx
/**
 * 파일럿 주간 리포트 — 피드백 + eval 후보 + Hit@3
 * Usage: npm run report:pilot-weekly
 */
import fs from "fs";
import { config } from "../src/lib/config";
import { aggregateFeedbackStats } from "../src/lib/audit/feedback-stats";
import type { AuditEntry } from "../src/lib/audit";
import {
  filterNewEvalCandidates,
  suggestEvalCandidates,
} from "../src/lib/search/eval-candidates";
import { loadEvalQueries } from "../src/lib/search/eval-store";
import { runEvalSearch } from "../src/lib/search/run-eval";

function readFeedbackLogs(): AuditEntry[] {
  const logPath = config.audit.logPath;
  if (!fs.existsSync(logPath)) return [];
  return fs
    .readFileSync(logPath, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AuditEntry)
    .filter((e) => e.action === "chat.feedback");
}

async function main() {
  const logs = readFeedbackLogs();
  const stats = aggregateFeedbackStats(logs, { topN: 5 });
  const evalQueries = await loadEvalQueries();
  const candidates = suggestEvalCandidates(stats.topDownQueries, evalQueries);
  const newCandidates = filterNewEvalCandidates(candidates);

  const upPct = stats.total > 0 ? ((stats.up / stats.total) * 100).toFixed(1) : "0";
  const downPct = stats.total > 0 ? ((stats.down / stats.total) * 100).toFixed(1) : "0";

  console.log("# CorpBrain 파일럿 주간 리포트 (자동 생성)");
  console.log(`생성: ${new Date().toISOString()}`);
  console.log("");

  console.log("## 3. 피드백 (👍/👎)");
  console.log("");
  console.log("| rating | 건수 | 비율 |");
  console.log("|--------|------|------|");
  console.log(`| up | ${stats.up} | ${upPct}% |`);
  console.log(`| down | ${stats.down} | ${downPct}% |`);
  console.log("");

  if (stats.topDownQueries.length === 0) {
    console.log("_👎 피드백 없음_");
  } else {
    console.log("**👎 Top 질문**");
    stats.topDownQueries.forEach((q, i) => {
      const src = q.sources.length ? ` (${q.sources.join(", ")})` : "";
      console.log(`${i + 1}. ${q.query} — ${q.count}건${src}`);
    });
  }

  console.log("");
  console.log("## 4. eval-queries 신규 후보");
  console.log("");
  if (newCandidates.length === 0) {
    console.log("_신규 후보 없음 (이미 반영됨 또는 👎 없음)_");
  } else {
    console.log("```json");
    console.log(
      JSON.stringify(
        newCandidates.map((c) => ({
          query: c.query,
          expectedFiles: c.suggestedExpectedFiles,
          role: c.role,
        })),
        null,
        2
      )
    );
    console.log("```");
    console.log("");
    console.log("Admin `/admin` 에서 **eval 추가** 또는 위 JSON을 `data/eval-queries.json`에 반영하세요.");
  }

  console.log("");
  console.log("## 2. 검색 품질 (Hit@3)");
  console.log("");

  const { metrics, passed, threshold } = await runEvalSearch();
  console.log(`| Hit@1 | Hit@3 | MRR | eval 문항 |`);
  console.log(`|-------|-------|-----|-----------|`);
  console.log(
    `| ${(metrics.hitAt1 * 100).toFixed(1)}% | ${(metrics.hitAt3 * 100).toFixed(1)}% | ${metrics.mrr.toFixed(3)} | ${evalQueries.length} |`
  );
  console.log("");
  console.log(passed ? `✓ PASS (Hit@3 ≥ ${(threshold * 100).toFixed(0)}%)` : `✗ FAIL (Hit@3 < ${(threshold * 100).toFixed(0)}%)`);

  if (!passed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
