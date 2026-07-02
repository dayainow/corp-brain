/** 한국어 질의 정규화 — 검색·리랭킹용 */
const SUFFIX_FILLERS =
  /(?:알려줘|알려주세요|뭐야|뭔가요|어떻게|무엇|있어|있나요|해줘|해주세요|좀)\s*$/;

const SYNONYMS: Record<string, string[]> = {
  휴가: ["휴가", "연차", "연차휴가"],
  nda: ["nda", "비밀유지", "기밀"],
  aws: ["aws", "아마존", "클라우드"],
  온보딩: ["온보딩", "입사", "신규"],
  장애: ["장애", "incident", "장애대응"],
};

export function normalizeKoreanQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[?!.,]/g, " ")
    .replace(SUFFIX_FILLERS, "")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .join(" ")
    .trim();
}

export function expandKoreanTokens(query: string): string[] {
  const normalized = normalizeKoreanQuery(query);
  const tokens = normalized.split(/\s+/).filter((t) => t.length > 0);
  const expanded = new Set(tokens);

  for (const token of tokens) {
    for (const [key, aliases] of Object.entries(SYNONYMS)) {
      if (token.includes(key) || aliases.some((a) => token.includes(a))) {
        aliases.forEach((a) => expanded.add(a));
      }
    }
  }

  return [...expanded];
}
