import { pipeline } from "@xenova/transformers";
import { config } from "@/lib/config";
import type { RankedDocument } from "./reranker";

type ClassifierItem = { label?: string; score?: number };
type ClassifierOutput = ClassifierItem | ClassifierItem[] | ClassifierItem[][] | unknown;
type Classifier = (
  input: string | string[],
  options?: { topk?: number }
) => Promise<ClassifierOutput>;

let crossEncoderPromise: Promise<Classifier | null> | null = null;
let loadedModelId: string | null = null;

/** A/B eval 등 모델 전환 시 캐시 초기화 */
export function resetCrossEncoderCache(): void {
  crossEncoderPromise = null;
  loadedModelId = null;
}

function activeCrossEncoderModel(): string {
  if (process.env.CROSS_ENCODER_MODEL !== undefined) {
    return process.env.CROSS_ENCODER_MODEL;
  }
  return config.search.crossEncoderModel;
}

function isPositiveLabel(label: string | undefined): boolean {
  if (!label) return false;
  const normalized = label.toLowerCase();
  return normalized.includes("1") || normalized.includes("pos") || normalized.includes("relevant");
}

export function extractClassifierScore(output: ClassifierOutput): number {
  const getBest = (items: ClassifierItem[]): number => {
    if (items.length === 0) return 0;
    const positive = items.find((item) => isPositiveLabel(item.label));
    if (positive?.score !== undefined) return positive.score;
    return Math.max(...items.map((item) => item.score ?? 0));
  };

  if (Array.isArray(output)) {
    if (output.length === 0) return 0;
    if (Array.isArray(output[0])) {
      return getBest((output[0] as ClassifierItem[]) ?? []);
    }
    return getBest(output as ClassifierItem[]);
  }
  return 0;
}

async function getCrossEncoder(): Promise<Classifier | null> {
  const modelId = activeCrossEncoderModel();
  if (!modelId) return null;
  if (loadedModelId !== modelId) {
    resetCrossEncoderCache();
    loadedModelId = modelId;
  }
  if (!crossEncoderPromise) {
    crossEncoderPromise = (async () => {
      try {
        const instance = (await pipeline(
          "text-classification",
          modelId
        )) as unknown as Classifier;
        return instance;
      } catch (err) {
        console.error("Cross-encoder load failed, fallback to heuristic reranker:", err);
        return null;
      }
    })();
  }
  return crossEncoderPromise;
}

export async function crossEncodeRerank(
  query: string,
  candidates: RankedDocument[]
): Promise<RankedDocument[]> {
  if (!activeCrossEncoderModel() || candidates.length === 0) return candidates;

  const model = await getCrossEncoder();
  if (!model) return candidates;

  const topN = Math.max(1, Math.min(config.search.crossEncoderTopN, candidates.length));
  const weight = config.search.crossEncoderWeight;
  const head = candidates.slice(0, topN);
  const tail = candidates.slice(topN);

  const rescored = await Promise.all(
    head.map(async (item) => {
      try {
        const pairInput = `${query} [SEP] ${item.document.text}`;
        const output = await model(pairInput, { topk: 2 });
        const ceScore = extractClassifierScore(output);
        return {
          ...item,
          rerankScore: item.rerankScore + ceScore * weight,
        };
      } catch {
        return item;
      }
    })
  );

  rescored.sort((a, b) => b.rerankScore - a.rerankScore);
  return [...rescored, ...tail];
}
