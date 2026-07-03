/** A/B·설정용 임베딩 모델 프리셋 */
export interface EmbeddingModelSpec {
  key: string;
  label: string;
  id: string;
  dimensions: number;
  quantized: boolean;
  normalize: boolean;
}

export const EMBEDDING_MODEL_PRESETS = {
  e5_small: {
    key: "e5_small",
    label: "multilingual-e5-small (기본)",
    id: "Xenova/multilingual-e5-small",
    dimensions: 384,
    quantized: true,
    normalize: false,
  },
  ko_sroberta: {
    key: "ko_sroberta",
    label: "ko-sroberta-multitask (한국어)",
    id: "jhgan/ko-sroberta-multitask",
    dimensions: 768,
    quantized: false,
    normalize: true,
  },
} as const satisfies Record<string, EmbeddingModelSpec>;

export type EmbeddingPresetKey = keyof typeof EMBEDDING_MODEL_PRESETS;

export const DEFAULT_AB_PRESETS: EmbeddingPresetKey[] = ["e5_small", "ko_sroberta"];

export function getEmbeddingPreset(key: string): EmbeddingModelSpec | undefined {
  if (key in EMBEDDING_MODEL_PRESETS) {
    return EMBEDDING_MODEL_PRESETS[key as EmbeddingPresetKey];
  }
  return Object.values(EMBEDDING_MODEL_PRESETS).find(
    (p) => p.id === key || p.key === key
  );
}

export function resolveAbPresets(keys?: string[]): EmbeddingModelSpec[] {
  const input = keys?.length ? keys : DEFAULT_AB_PRESETS;
  const specs: EmbeddingModelSpec[] = [];
  for (const k of input) {
    const preset = getEmbeddingPreset(k);
    if (!preset) throw new Error(`알 수 없는 임베딩 프리셋: ${k}`);
    specs.push(preset);
  }
  return specs;
}
