import { NextResponse } from "next/server";
import { getVectorStore } from "@/lib/vector-store";
import { config } from "@/lib/config";
import { isPgAvailable } from "@/lib/db/client";

async function checkOllama(): Promise<{ ok: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000);
    const res = await fetch(`${config.ollama.baseURL}/models`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return { ok: res.ok };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export async function GET() {
  const checks: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "0.1.0",
    vectorStore: config.vectorStore.type,
    checks: {},
  };

  const nested = checks.checks as Record<string, unknown>;

  try {
    const store = getVectorStore();
    checks.chunkCount = await store.count();
    nested.vectorStore = "ok";
  } catch (e) {
    checks.status = "degraded";
    nested.vectorStore = "error";
    checks.vectorStoreError = String(e);
  }

  if (config.vectorStore.type === "pgvector") {
    const pgOk = await isPgAvailable();
    nested.postgres = pgOk ? "ok" : "error";
    if (!pgOk) checks.status = "degraded";
  }

  const ollama = await checkOllama();
  nested.ollama = ollama.ok ? "ok" : "error";
  if (!ollama.ok) {
    checks.status = "degraded";
    checks.ollamaError = ollama.error;
  }

  const status = checks.status === "ok" ? 200 : 503;
  return NextResponse.json(checks, { status });
}
