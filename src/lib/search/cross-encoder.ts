import {
  AutoModelForSequenceClassification,
  AutoTokenizer,
} from "@xenova/transformers";
import { config } from "@/lib/config";
import type { RankedDocument } from "./reranker";

type Tokenizer = Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>;
type CrossEncoderModel = Awaited<
  ReturnType<typeof AutoModelForSequenceClassification.from_pretrained>
>;

type CrossEncoderBundle = {
  tokenizer: Tokenizer;
  model: CrossEncoderModel;
  modelId: string;
};

type ClassifierItem = { label?: string; score?: number };
type ClassifierOutput = ClassifierItem | ClassifierItem[] | ClassifierItem[][] | unknown;

let crossEncoderPromise: Promise<CrossEncoderBundle | null> | null = null;
let loadedModelId: string | null = null;

/** A/B eval 등 모델 전환 시 캐시 초기화 */
export function resetCrossEncoderCache(): void {
  crossEncoderPromise = null;
  loadedModelId = null;
}

/** cross-encoder/* 원본 HF repo는 ONNX 없음 → Xenova 변환본으로 매핑 */
export function normalizeCrossEncoderModelId(modelId: string): string {
  if (modelId.startsWith("cross-encoder/")) {
    return modelId.replace(/^cross-encoder\//, "Xenova/");
  }
  return modelId;
}

function activeCrossEncoderModel(): string {
  const raw =
    process.env.CROSS_ENCODER_MODEL !== undefined
      ? process.env.CROSS_ENCODER_MODEL
      : config.search.crossEncoderModel;
  return raw ? normalizeCrossEncoderModelId(raw) : "";
}

function isPositiveLabel(label: string | undefined): boolean {
  if (!label) return false;
  const normalized = label.toLowerCase();
  return normalized.includes("1") || normalized.includes("pos") || normalized.includes("relevant");
}

/** pipeline text-classification 출력 파싱 (레거시·단위 테스트용) */
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

/** 단일 로짓 회귀 헤드(num_labels=1) 또는 2-class 분류 로짓에서 관련도 점수 추출 */
export function extractLogitScore(
  logits: { data: ArrayLike<number>; dims: number[] },
  index: number
): number {
  const numLabels = logits.dims[1] ?? 1;
  const data = logits.data;
  if (numLabels === 1) {
    return Number(data[index] ?? 0);
  }
  return Number(data[index * numLabels + 1] ?? 0);
}

async function getCrossEncoder(): Promise<CrossEncoderBundle | null> {
  const modelId = activeCrossEncoderModel();
  if (!modelId) return null;
  if (loadedModelId !== modelId) {
    resetCrossEncoderCache();
    loadedModelId = modelId;
  }
  if (!crossEncoderPromise) {
    crossEncoderPromise = (async () => {
      try {
        const [tokenizer, model] = await Promise.all([
          AutoTokenizer.from_pretrained(modelId),
          AutoModelForSequenceClassification.from_pretrained(modelId, {
            quantized: true,
          }),
        ]);
        return { tokenizer, model, modelId };
      } catch (err) {
        console.error("Cross-encoder load failed, fallback to heuristic reranker:", err);
        return null;
      }
    })();
  }
  return crossEncoderPromise;
}

async function scoreCandidates(
  bundle: CrossEncoderBundle,
  query: string,
  passages: string[]
): Promise<number[]> {
  if (passages.length === 0) return [];
  const queries = new Array(passages.length).fill(query);
  const inputs = await bundle.tokenizer(queries, {
    text_pair: passages,
    padding: true,
    truncation: true,
  });
  const { logits } = await bundle.model(inputs);
  return passages.map((_, i) => extractLogitScore(logits, i));
}

export async function crossEncodeRerank(
  query: string,
  candidates: RankedDocument[]
): Promise<RankedDocument[]> {
  if (!activeCrossEncoderModel() || candidates.length === 0) return candidates;

  const bundle = await getCrossEncoder();
  if (!bundle) return candidates;

  const topN = Math.max(1, Math.min(config.search.crossEncoderTopN, candidates.length));
  const weight = config.search.crossEncoderWeight;
  const head = candidates.slice(0, topN);
  const tail = candidates.slice(topN);

  try {
    const ceScores = await scoreCandidates(
      bundle,
      query,
      head.map((item) => item.document.text)
    );
    const rescored = head.map((item, i) => ({
      ...item,
      rerankScore: item.rerankScore + ceScores[i] * weight,
    }));
    rescored.sort((a, b) => b.rerankScore - a.rerankScore);
    return [...rescored, ...tail];
  } catch {
    return candidates;
  }
}
