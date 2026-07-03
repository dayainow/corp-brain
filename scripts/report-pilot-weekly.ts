#!/usr/bin/env tsx
/**
 * 파일럿 주간 리포트 — 질문·피드백·Hit@3·eval 후보
 * Usage:
 *   npm run report:pilot-weekly
 *   npm run report:pilot-weekly -- --no-file   # stdout만
 */
import fs from "fs";
import path from "path";
import { config } from "../src/lib/config";
import { aggregateFeedbackStats } from "../src/lib/audit/feedback-stats";
import type { AuditEntry } from "../src/lib/audit";
import {
  filterNewEvalCandidates,
  suggestEvalCandidates,
} from "../src/lib/search/eval-candidates";
import { loadEvalQueries } from "../src/lib/search/eval-store";
import { runEvalSearch } from "../src/lib/search/run-eval";

function readAuditLogs(): AuditEntry[] {
  const logPath = config.audit.logPath;
  if (!fs.existsSync(logPath)) return [];
  return fs
    .readFileSync(logPath, "utf-8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AuditEntry);
}

function countUniqueUsers(logs: AuditEntry[], action: AuditEntry["action"]): number {
  const emails = new Set(
    logs.filter((e) => e.action === action && e.userEmail).map((e) => e.userEmail)
  );
  return emails.size;
}

async function main() {
  const writeFile = !process.argv.includes("--no-file");
  const logs = readAuditLogs();
  const feedbackLogs = logs.filter((e) => e.action === "chat.feedback");
  const queryCount = logs.filter((e) => e.action === "chat.query").length;
  const activeUsers = countUniqueUsers(logs, "chat.query");

  const stats = aggregateFeedbackStats(feedbackLogs, { topN: 5 });
  const evalQueries = await loadEvalQueries();
  const candidates = suggestEvalCandidates(stats.topDownQueries, evalQueries);
  const newCandidates = filterNewEvalCandidates(candidates);

  const upPct = stats.total > 0 ? ((stats.up / stats.total) * 100).toFixed(1) : "0";
  const downPct = stats.total > 0 ? ((stats.down / stats.total) * 100).toFixed(1) : "0";

  const { metrics, passed, threshold } = await runEvalSearch();

  const lines: string[] = [];
  const push = (line = "") => lines.push(line);

  push("# CorpBrain 파일럿 주간 리포트 (자동 생성)");
  push();
  push(`> 생성: ${new Date().toISOString()}`);
  push(`> 템플릿: docs/PILOT_QUALITY_REPORT.md · 체크리스트: docs/PILOT_CHECKLIST.md C항목`);
  push();

  push("## 1. 요약");
  push();
  push("| 항목 | 값 |");
  push("|------|-----|");
  push(`| 총 질문 수 (\`chat.query\`) | ${queryCount}건 |`);
  push(`| 활성 사용자 (질문 이메일 unique) | ${activeUsers}명 |`);
  push(`| 피드백 (👍/👎) | ${stats.total}건 |`);
  push(`| 👎 비율 | ${(stats.downRate * 100).toFixed(1)}% |`);
  push();

  push("## 2. 검색 품질 (Hit@3)");
  push();
  push("| Hit@1 | Hit@3 | MRR | eval 문항 |");
  push("|-------|-------|-----|-----------|");
  push(
    `| ${(metrics.hitAt1 * 100).toFixed(1)}% | ${(metrics.hitAt3 * 100).toFixed(1)}% | ${metrics.mrr.toFixed(3)} | ${evalQueries.length} |`
  );
  push();
  push(
    passed
      ? `✓ PASS (Hit@3 ≥ ${(threshold * 100).toFixed(0)}%)`
      : `✗ FAIL (Hit@3 < ${(threshold * 100).toFixed(0)}%)`
  );
  push();

  push("## 3. 피드백 (👍/👎)");
  push();
  push("| rating | 건수 | 비율 |");
  push("|--------|------|------|");
  push(`| up | ${stats.up} | ${upPct}% |`);
  push(`| down | ${stats.down} | ${downPct}% |`);
  push();

  if (stats.topDownQueries.length === 0) {
    push("_👎 피드백 없음_");
  } else {
    push("**👎 Top 질문**");
    stats.topDownQueries.forEach((q, i) => {
      const src = q.sources.length ? ` (${q.sources.join(", ")})` : "";
      push(`${i + 1}. ${q.query} — ${q.count}건${src}`);
    });
  }
  push();

  push("## 4. eval-queries 신규 후보 (C4)");
  push();
  if (newCandidates.length === 0) {
    push("_신규 후보 없음 (이미 반영됨 또는 👎 없음)_");
  } else {
    push("```json");
    push(
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
    push("```");
    push();
    push(
      "→ `data/eval-queries.json` 반영 또는 Admin 검토 (docs/PILOT_CHECKLIST.md C4)"
    );
  }
  push();

  push("## 5. D+7 체크리스트 (수동)");
  push();
  push("| # | 항목 | 상태 |");
  push("|---|------|------|");
  push("| C1 | 일일 health 점검 | ☐ |");
  push("| C2 | 피드백 검토 (`report:feedback`) | ☐ |");
  push("| C3 | vault 변경 시 Sync Vault | ☐ |");
  push("| C4 | 실패 질문 → eval·동의어 보완 | ☐ |");
  push("| C5 | Hit@3 재측정 (위 §2 참고) | " + (passed ? "☑" : "☐") + " |");
  push("| C6 | 회고·Go/No-Go | ☐ |");
  push();

  const report = lines.join("\n");
  console.log(report);

  if (writeFile) {
    const dir = path.join(process.cwd(), "data", "reports");
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 10);
    const outPath = path.join(dir, `pilot-weekly-${stamp}.md`);
    fs.writeFileSync(outPath, `${report}\n`, "utf-8");
    console.log("");
    console.log(`저장: ${outPath}`);
    console.log("→ docs/PILOT_QUALITY_REPORT.md §1·§4·§6에 복사 후 회고 작성");
  }

  if (!passed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
