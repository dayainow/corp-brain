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

export async function GET() {
  const { error } = await requireAuth("admin");
  if (error) return error;

  try {
    const evalPath = path.join(process.cwd(), "data/eval-queries.json");
    if (!fs.existsSync(evalPath)) {
      return NextResponse.json({ error: "평가 데이터 없음" }, { status: 404 });
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

    return NextResponse.json({
      metrics: {
        hitAt1: Math.round(metrics.hitAt1 * 1000) / 1000,
        hitAt3: Math.round(metrics.hitAt3 * 1000) / 1000,
        mrr: Math.round(metrics.mrr * 1000) / 1000,
        queryCount: metrics.count,
        targetHitAt3: 0.8,
      },
      results,
    });
  } catch (err) {
    console.error("Metrics eval failed:", err);
    return NextResponse.json({ error: "평가 실패" }, { status: 500 });
  }
}
