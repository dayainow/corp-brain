import type { AuditEntry } from "./index";

export interface DownQueryStat {
  query: string;
  count: number;
  sources: string[];
  lastAt: string;
}

export interface RecentFeedback {
  rating: "up" | "down";
  query: string;
  userEmail: string;
  timestamp: string;
  sources: string[];
}

export interface FeedbackStats {
  up: number;
  down: number;
  total: number;
  downRate: number;
  topDownQueries: DownQueryStat[];
  recent: RecentFeedback[];
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export function aggregateFeedbackStats(
  logs: AuditEntry[],
  options?: { topN?: number; recentN?: number }
): FeedbackStats {
  const topN = options?.topN ?? 5;
  const recentN = options?.recentN ?? 10;

  const feedbackLogs = logs.filter((l) => l.action === "chat.feedback");
  let up = 0;
  let down = 0;
  const downByQuery = new Map<string, DownQueryStat>();
  const recent: RecentFeedback[] = [];

  for (const log of feedbackLogs) {
    const rating = log.detail?.rating;
    if (rating !== "up" && rating !== "down") continue;

    const query = String(log.detail?.query ?? "").trim() || "(질문 없음)";
    const sources = asStringArray(log.detail?.sources);

    if (rating === "up") {
      up += 1;
    } else {
      down += 1;
      const existing = downByQuery.get(query);
      if (existing) {
        existing.count += 1;
        existing.lastAt = log.timestamp;
        for (const s of sources) {
          if (!existing.sources.includes(s)) existing.sources.push(s);
        }
      } else {
        downByQuery.set(query, {
          query,
          count: 1,
          sources: [...sources],
          lastAt: log.timestamp,
        });
      }
    }

    recent.push({
      rating,
      query,
      userEmail: log.userEmail,
      timestamp: log.timestamp,
      sources,
    });
  }

  const total = up + down;
  const topDownQueries = [...downByQuery.values()]
    .sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt))
    .slice(0, topN);

  return {
    up,
    down,
    total,
    downRate: total > 0 ? down / total : 0,
    topDownQueries,
    recent: recent
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, recentN),
  };
}
