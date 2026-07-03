/**
 * CorpBrain Quality Suite Harness
 * 팀별 품질 게이트를 순차 실행합니다.
 */
import fs from "fs";
import path from "path";
import { config, getVaultPath } from "@/lib/config";
import { canAccessDocument, canUploadDocuments, canReindexVault } from "@/lib/rbac";
import { buildSearchQuery } from "@/lib/search/query-context";
import { toModelMessages, validateChatMessages } from "@/lib/chat/messages";
import { HARNESS_AGENTS, HARNESS_TEAMS, type HarnessTeamId } from "./teams";

export interface HarnessCheckResult {
  check: string;
  team: HarnessTeamId;
  passed: boolean;
  detail?: string;
}

export interface HarnessReport {
  passed: boolean;
  results: HarnessCheckResult[];
  summary: Record<HarnessTeamId, { passed: number; failed: number }>;
}

export function runPlatformChecks(): HarnessCheckResult[] {
  const vaultPath = getVaultPath();
  return [
    {
      check: "vaultExists",
      team: "platform",
      passed: fs.existsSync(vaultPath),
      detail: vaultPath,
    },
    {
      check: "vaultPathDefault",
      team: "delivery",
      passed: vaultPath.endsWith(`${path.sep}vault`),
      detail: vaultPath,
    },
    {
      check: "embeddingModelConfig",
      team: "delivery",
      passed:
        config.rag.embeddingModel.includes("e5") ||
        config.rag.embeddingModel.includes("MiniLM") ||
        config.rag.embeddingModel.includes("sroberta"),
      detail: config.rag.embeddingModel,
    },
  ];
}

export function runSecurityChecks(): HarnessCheckResult[] {
  return [
    {
      check: "roleHierarchy",
      team: "security",
      passed:
        canAccessDocument("admin", "general") &&
        canAccessDocument("manager", "general") &&
        !canAccessDocument("general", "admin"),
    },
    {
      check: "uploadPermissions",
      team: "security",
      passed: canUploadDocuments("manager") && !canUploadDocuments("general"),
    },
    {
      check: "syncVaultAdminOnly",
      team: "security",
      passed: canReindexVault("admin") && !canReindexVault("manager"),
    },
  ];
}

export function runRagChecks(): HarnessCheckResult[] {
  const uiMessages = [
    { role: "user", parts: [{ type: "text", text: "휴가 규정" }] },
    { role: "assistant", parts: [{ type: "text", text: "연차 15일 [출처: 연차휴가규정.md]" }] },
    { role: "user", parts: [{ type: "text", text: "예외는?" }] },
  ];

  const validation = validateChatMessages(uiMessages);
  const modelMessages = toModelMessages(uiMessages);
  const searchQuery = buildSearchQuery(uiMessages);

  return [
    {
      check: "validateChatMessages",
      team: "rag",
      passed: validation.ok === true,
    },
    {
      check: "toModelMessages",
      team: "rag",
      passed: modelMessages.length === 3 && modelMessages[2].role === "user",
    },
    {
      check: "queryContextFollowUp",
      team: "search",
      passed: searchQuery.includes("현재 질문: 예외는?") && searchQuery.includes("휴가"),
    },
  ];
}

export function runQualityHarness(): HarnessReport {
  const results: HarnessCheckResult[] = [
    ...runPlatformChecks(),
    ...runSecurityChecks(),
    ...runRagChecks(),
  ];

  const summary = Object.keys(HARNESS_TEAMS).reduce(
    (acc, team) => {
      const id = team as HarnessTeamId;
      const teamResults = results.filter((r) => r.team === id);
      acc[id] = {
        passed: teamResults.filter((r) => r.passed).length,
        failed: teamResults.filter((r) => !r.passed).length,
      };
      return acc;
    },
    {} as HarnessReport["summary"]
  );

  return {
    passed: results.every((r) => r.passed),
    results,
    summary,
  };
}

export function formatHarnessReport(report: HarnessReport): string {
  const lines = ["=== CorpBrain Quality Harness ===", ""];
  for (const agent of HARNESS_AGENTS) {
    const team = HARNESS_TEAMS[agent.team];
    lines.push(`[${team.label}] ${agent.name}`);
    for (const check of agent.checks) {
      const result = report.results.find((r) => r.check === check);
      if (!result) continue;
      const icon = result.passed ? "✓" : "✗";
      lines.push(`  ${icon} ${check}${result.detail ? ` (${result.detail})` : ""}`);
    }
    lines.push("");
  }
  lines.push(report.passed ? "PASS: 모든 하네스 검사 통과" : "FAIL: 하네스 검사 실패");
  return lines.join("\n");
}
