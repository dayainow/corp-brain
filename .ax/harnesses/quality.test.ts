import { describe, it, expect } from "vitest";
import {
  runQualityHarness,
  runPlatformChecks,
  runSecurityChecks,
  runRagChecks,
  runSearchChecks,
} from "./quality-suite-harness";
import { HARNESS_AGENTS, HARNESS_TEAMS } from "./teams";

describe("Quality Suite Harness", () => {
  it("팀 구성이 5개 역할을 포함", () => {
    expect(Object.keys(HARNESS_TEAMS)).toHaveLength(5);
    expect(HARNESS_AGENTS.length).toBeGreaterThanOrEqual(5);
  });

  it("플랫폼·보안·RAG 검사 통과", () => {
    const platform = runPlatformChecks();
    const security = runSecurityChecks();
    const rag = runRagChecks();

    expect(platform.filter((r) => r.check !== "chunkIndexReady").every((r) => r.passed)).toBe(
      true
    );
    expect(security.every((r) => r.passed)).toBe(true);
    expect(rag.every((r) => r.passed)).toBe(true);
  });

  it("인덱스가 있으면 Hit@3 게이트 통과", async () => {
    const search = await runSearchChecks();
    const hitAt3 = search.find((r) => r.check === "hitAt3Threshold");
    expect(hitAt3).toBeDefined();
    if (hitAt3?.detail?.includes("인덱스 없음")) {
      return;
    }
    expect(hitAt3?.passed).toBe(true);
  });

  it("전체 하네스 리포트 PASS", async () => {
    const report = await runQualityHarness();
    if (!report.passed) {
      const failed = report.results.filter((r) => !r.passed);
      console.error("Failed checks:", failed);
    }
    const chunk = report.results.find((r) => r.check === "chunkIndexReady");
    if (!chunk?.passed) {
      return;
    }
    expect(report.passed).toBe(true);
  });
});
