import { pipeline, env } from "@xenova/transformers";
import { config } from "@/lib/config";

env.allowLocalModels = false;

class EmbeddingPipeline {
  static task = "feature-extraction" as const;
  static model = config.rag.embeddingModel;
  static instance: Promise<Awaited<ReturnType<typeof pipeline>>> | null = null;

  static async getInstance(progressCallback?: (progress: unknown) => void) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback: progressCallback });
    }
    return this.instance;
  }

  /** 서버 기동 시 cold start 완화 */
  static async warmup(): Promise<void> {
    await generateEmbedding("warmup");
  }
}

type FeatureExtractorOutput = { data: ArrayLike<number> };
type FeatureExtractor = (
  input: string,
  options?: { pooling?: "mean"; normalize?: boolean }
) => Promise<FeatureExtractorOutput>;

export async function generateEmbedding(text: string): Promise<number[]> {
  const extractor = (await EmbeddingPipeline.getInstance()) as unknown as FeatureExtractor;
  const output = await extractor(text, { pooling: "mean" });
  return Array.from(output.data);
}
