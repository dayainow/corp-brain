const DEFAULT_BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";

export interface RagE2EStatus {
  ready: boolean;
  chunkCount: number;
  ollama: string;
  reason?: string;
}

export async function checkRagE2EReady(
  baseURL: string = DEFAULT_BASE
): Promise<RagE2EStatus> {
  try {
    const res = await fetch(`${baseURL}/api/health`, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) {
      return { ready: false, chunkCount: 0, ollama: "error", reason: "health API 실패" };
    }
    const data = (await res.json()) as {
      chunkCount?: number;
      checks?: { ollama?: string; index?: string };
    };
    const chunkCount = data.chunkCount ?? 0;
    const ollama = data.checks?.ollama ?? "unknown";

    if (chunkCount === 0) {
      return {
        ready: false,
        chunkCount,
        ollama,
        reason: "벡터 인덱스 비어 있음 — npm run index:vault 선행",
      };
    }
    if (ollama !== "ok") {
      return {
        ready: false,
        chunkCount,
        ollama,
        reason: "Ollama 미기동 — ollama run llama3",
      };
    }
    return { ready: true, chunkCount, ollama };
  } catch {
    return {
      ready: false,
      chunkCount: 0,
      ollama: "unreachable",
      reason: "서버에 연결할 수 없음",
    };
  }
}
