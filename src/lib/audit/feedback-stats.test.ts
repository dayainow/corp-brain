import { describe, expect, it } from "vitest";
import { aggregateFeedbackStats } from "./feedback-stats";
import type { AuditEntry } from "./index";

const base = (overrides: Partial<AuditEntry>): AuditEntry => ({
  timestamp: "2026-07-03T10:00:00.000Z",
  action: "chat.feedback",
  userId: "u1",
  userEmail: "kim.junho@novapay.kr",
  userRole: "general",
  ...overrides,
});

describe("aggregateFeedbackStats", () => {
  it("👍/👎 건수와 down 비율을 집계한다", () => {
    const stats = aggregateFeedbackStats([
      base({ detail: { rating: "up", query: "연차 규정" } }),
      base({ detail: { rating: "down", query: "연차 규정" } }),
      base({ detail: { rating: "down", query: "연차 규정" } }),
    ]);
    expect(stats.up).toBe(1);
    expect(stats.down).toBe(2);
    expect(stats.total).toBe(3);
    expect(stats.downRate).toBeCloseTo(2 / 3);
  });

  it("down 질문 Top N을 count 순으로 반환한다", () => {
    const stats = aggregateFeedbackStats(
      [
        base({
          timestamp: "2026-07-03T09:00:00.000Z",
          detail: { rating: "down", query: "휴가", sources: ["a.md"] },
        }),
        base({
          timestamp: "2026-07-03T10:00:00.000Z",
          detail: { rating: "down", query: "연차", sources: ["b.md"] },
        }),
        base({
          timestamp: "2026-07-03T11:00:00.000Z",
          detail: { rating: "down", query: "연차", sources: ["c.md"] },
        }),
      ],
      { topN: 2 }
    );
    expect(stats.topDownQueries[0].query).toBe("연차");
    expect(stats.topDownQueries[0].count).toBe(2);
    expect(stats.topDownQueries[0].sources).toContain("b.md");
  });
});
