import { pipeline, env } from "@xenova/transformers";
import { config } from "@/lib/config";
import { getEmbeddingPreset, type EmbeddingModelSpec } from "./models";

env.allowLocalModels = false;

type FeatureExtractorOutput = { data: ArrayLike<number> };
type FeatureExtractor = (
  input: string,
  options?: { pooling?: "mean"; normalize?: boolean }
) => Promise<FeatureExtractorOutput>;

const pipelines = new Map<string, Promise<FeatureExtractor>>();

function cacheKey(spec: EmbeddingModelSpec): string {
  return `${spec.id}:${spec.quantized}:${spec.normalize}`;
}

function resolveSpec(model?: string): EmbeddingModelSpec {
  const modelId = model ?? config.rag.embeddingModel;
  const preset = getEmbeddingPreset(modelId);
  if (preset) return preset;
  return {
    key: modelId,
    label: modelId,
    id: modelId,
    dimensions: 0,
    quantized: !modelId.includes("ko-sroberta"),
    normalize: modelId.includes("ko-sroberta"),
  };
}

async function getExtractor(spec: EmbeddingModelSpec): Promise<FeatureExtractor> {
  const key = cacheKey(spec);
  if (!pipelines.has(key)) {
    pipelines.set(
      key,
      pipeline("feature-extraction", spec.id, {
        quantized: spec.quantized,
      }) as Promise<FeatureExtractor>
    );
  }
  return pipelines.get(key)!;
}

export function resetEmbeddingPipelines(): void {
  pipelines.clear();
}

export async function generateEmbedding(
  text: string,
  options?: { model?: string }
): Promise<number[]> {
  const spec = resolveSpec(options?.model);
  const extractor = await getExtractor(spec);
  const output = await extractor(text, {
    pooling: "mean",
    normalize: spec.normalize,
  });
  return Array.from(output.data);
}

/** 서버 기동 시 cold start 완화 */
export async function warmupEmbeddings(): Promise<void> {
  await generateEmbedding("warmup");
}

// 하위 호환
export async function warmup(): Promise<void> {
  await warmupEmbeddings();
}

export { resolveSpec as resolveEmbeddingSpec };
