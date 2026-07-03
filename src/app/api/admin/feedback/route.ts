import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { readAuditLogsFiltered } from "@/lib/audit";
import { aggregateFeedbackStats } from "@/lib/audit/feedback-stats";
import {
  filterNewEvalCandidates,
  suggestEvalCandidates,
} from "@/lib/search/eval-candidates";
import { loadEvalQueries } from "@/lib/search/eval-store";

export async function GET(req: Request) {
  const { error } = await requireAuth("admin");
  if (error) return error;

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "2000"), 5000);
  const topN = Math.min(Number(url.searchParams.get("topN") ?? "5"), 20);

  const [logs, evalQueries] = await Promise.all([
    readAuditLogsFiltered({ action: "chat.feedback", limit }),
    loadEvalQueries(),
  ]);
  const stats = aggregateFeedbackStats(logs, { topN });
  const evalCandidates = suggestEvalCandidates(stats.topDownQueries, evalQueries);
  const newCandidates = filterNewEvalCandidates(evalCandidates);

  return NextResponse.json({
    stats,
    evalCandidates,
    newCandidates,
    evalQueryCount: evalQueries.length,
    hint:
      newCandidates.length > 0
        ? `${newCandidates.length}건 eval 후보 — Admin에서 추가하거나 npm run report:pilot-weekly 참고`
        : stats.topDownQueries.length > 0
          ? "👎 Top 질문이 모두 eval에 반영되었거나 신규 후보가 없습니다."
          : "아직 👎 피드백이 없습니다.",
  });
}
