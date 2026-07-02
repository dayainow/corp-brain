import { NextResponse } from "next/server";
import { getVectorStore } from "@/lib/vector-store";
import { config } from "@/lib/config";
import { isPgAvailable } from "@/lib/db/client";

export async function GET() {
  const checks: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "0.1.0",
    vectorStore: config.vectorStore.type,
  };

  try {
    const store = getVectorStore();
    checks.chunkCount = await store.count();
  } catch (e) {
    checks.status = "degraded";
    checks.vectorStoreError = String(e);
  }

  if (config.vectorStore.type === "pgvector") {
    checks.postgres = await isPgAvailable();
  }

  const status = checks.status === "ok" ? 200 : 503;
  return NextResponse.json(checks, { status });
}
