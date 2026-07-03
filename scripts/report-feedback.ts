#!/usr/bin/env tsx
/**
 * audit.log chat.feedback 집계 → PILOT_QUALITY_REPORT §3 채우기용
 * Usage: npm run report:feedback
 */
import fs from "fs";
import { config } from "../src/lib/config";
import { aggregateFeedbackStats } from "../src/lib/audit/feedback-stats";
import type { AuditEntry } from "../src/lib/audit";

function readFeedbackLogs(): AuditEntry[] {
  const path = config.audit.logPath;
  if (!fs.existsSync(path)) return [];
  const lines = fs.readFileSync(path, "utf-8").trim().split("\n").filter(Boolean);
  return lines
    .map((line) => JSON.parse(line) as AuditEntry)
    .filter((e) => e.action === "chat.feedback");
}

const logs = readFeedbackLogs();
const stats = aggregateFeedbackStats(logs, { topN: 5, recentN: 10 });

const upPct = stats.total > 0 ? ((stats.up / stats.total) * 100).toFixed(1) : "0";
const downPct = stats.total > 0 ? ((stats.down / stats.total) * 100).toFixed(1) : "0";

console.log("## 3. 피드백 (👍/👎) — 자동 생성");
console.log("");
console.log("| rating | 건수 | 비율 |");
console.log("|--------|------|------|");
console.log(`| up | ${stats.up} | ${upPct}% |`);
console.log(`| down | ${stats.down} | ${downPct}% |`);
console.log("");
console.log("**down 비율 높은 질문 Top 5** (audit `chat.feedback` 기준)");
console.log("");

if (stats.topDownQueries.length === 0) {
  console.log("_아직 👎 피드백 없음_");
} else {
  stats.topDownQueries.forEach((q, i) => {
    const sources = q.sources.length ? ` (${q.sources.join(", ")})` : "";
    console.log(`${i + 1}. ${q.query} — ${q.count}건${sources}`);
  });
}

console.log("");
console.log("---");
console.log(`총 피드백: ${stats.total}건 · down 비율: ${(stats.downRate * 100).toFixed(1)}%`);
console.log("Admin 대시보드: /admin · API: GET /api/admin/feedback");
