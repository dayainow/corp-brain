import { pipeline, env, PipelineType } from "@xenova/transformers";

// Disable local models directory to force download from Hugging Face initially, 
// or you can configure it to cache locally.
env.allowLocalModels = false;

// We use the singleton pattern for the embedding pipeline to avoid reloading it on every request.
class EmbeddingPipeline {
  static task: PipelineType = "feature-extraction";
  static model = "Xenova/all-MiniLM-L6-v2";
  static instance: any = null;

  static async getInstance(progress_callback?: any) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const extractor = await EmbeddingPipeline.getInstance();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}
