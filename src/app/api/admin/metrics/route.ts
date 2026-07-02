import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/auth/guard";
import { generateEmbedding } from "@/lib/embeddings";
import { hybridSearch } from "@/lib/vector-store";
import {
  evaluateQuery,
  aggregateMetrics,
  type EvalQuery,
} from "@/lib/search/metrics";
import { logError } from "@/lib/logger";

const CACHE_TTL_MS = 15 * 60 * 1000;

let cachedMetrics: {
  expiresAt: number;
  payload: Record<string, unknown>;
} | null = null;

async function computeMetrics() {
  const evalPath = path.join(process.cwd(), "data/eval-queries.json");
  if (!fs.existsSync(evalPath)) {
    return { error: "평가 데이터 없음", status: 404 as const };
  }

  const queries: EvalQuery[] = JSON.parse(
    await fs.promises.readFile(evalPath, "utf-8")
  );

  const results = [];
  for (const q of queries) {
    const embedding = await generateEmbedding(q.query);
    const docs = await hybridSearch(q.query, embedding, 5, q.role ?? "admin");
    const retrievedFiles = [
      ...new Set(docs.map((d) => d.metadata.fileName as string)),
    ];
    results.push(evaluateQuery(q, retrievedFiles));
  }

  const metrics = aggregateMetrics(results);

  return {
    status: 200 as const,
    payload: {
      metrics: {
        hitAt1: Math.round(metrics.hitAt1 * 1000) / 1000,
        hitAt3: Math.round(metrics.hitAt3 * 1000) / 1000,
        mrr: Math.round(metrics.mrr * 1000) / 1000,
        queryCount: metrics.count,
        targetHitAt3: 0.8,
      },
      results,
      cachedAt: new Date().toISOString(),
    },
  };
}

export async function GET(req: Request) {
  const { error } = await requireAuth("admin");
  if (error) return error;

  const refresh = new URL(req.url).searchParams.get("refresh") === "true";
  const now = Date.now();

  if (!refresh && cachedMetrics && cachedMetrics.expiresAt > now) {
    return NextResponse.json({
      ...cachedMetrics.payload,
      cache: { hit: true, expiresAt: new Date(cachedMetrics.expiresAt).toISOString() },
    });
  }

  try {
    const result = await computeMetrics();
    if (result.status === 404) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    cachedMetrics = {
      expiresAt: now + CACHE_TTL_MS,
      payload: result.payload,
    };

    return NextResponse.json({
      ...result.payload,
      cache: { hit: false, expiresAt: new Date(now + CACHE_TTL_MS).toISOString() },
    });
  } catch (err) {
    logError("admin.metrics", { err, path: "/api/admin/metrics" });
    return NextResponse.json({ error: "평가 실패" }, { status: 500 });
  }
}
