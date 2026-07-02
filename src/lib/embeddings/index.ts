import { pipeline, env } from "@xenova/transformers";

// Disable local models directory to force download from Hugging Face initially, 
// or you can configure it to cache locally.
env.allowLocalModels = false;

// We use the singleton pattern for the embedding pipeline to avoid reloading it on every request.
class EmbeddingPipeline {
  static task = "feature-extraction" as const;
  static model = "Xenova/all-MiniLM-L6-v2";
  static instance: Promise<Awaited<ReturnType<typeof pipeline>>> | null = null;

  static async getInstance(progressCallback?: (progress: unknown) => void) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback: progressCallback });
    }
    return this.instance;
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
