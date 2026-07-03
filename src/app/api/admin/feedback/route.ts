import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { readAuditLogsFiltered } from "@/lib/audit";
import { aggregateFeedbackStats } from "@/lib/audit/feedback-stats";

export async function GET(req: Request) {
  const { error } = await requireAuth("admin");
  if (error) return error;

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "2000"), 5000);
  const topN = Math.min(Number(url.searchParams.get("topN") ?? "5"), 20);

  const logs = await readAuditLogsFiltered({
    action: "chat.feedback",
    limit,
  });
  const stats = aggregateFeedbackStats(logs, { topN });

  return NextResponse.json({
    stats,
    hint:
      stats.topDownQueries.length > 0
        ? "👎 Top 질문을 data/eval-queries.json 후보로 검토하세요."
        : "아직 👎 피드백이 없습니다.",
  });
}
