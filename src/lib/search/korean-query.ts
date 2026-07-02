/** 한국어 질의 정규화 — 검색·리랭킹용 */
const SUFFIX_FILLERS =
  /(?:알려줘|알려주세요|뭐야|뭔가요|어떻게|무엇|있어|있나요|해줘|해주세요|좀)\s*$/;

const SYNONYMS: Record<string, string[]> = {
  휴가: ["휴가", "연차", "연차휴가", "휴가신청"],
  재택: ["재택", "재택근무", "원격", "재택근무정책"],
  출장: ["출장", "출장비", "출장경비", "여비"],
  nda: ["nda", "비밀유지", "기밀", "비밀유지계약"],
  aws: ["aws", "아마존", "클라우드", "인프라비용"],
  온보딩: ["온보딩", "입사", "신규", "신규입사"],
  장애: ["장애", "incident", "장애대응", "장애메모"],
  실적: ["실적", "매출", "성과", "분기실적", "q2", "q1"],
  인보이스: ["인보이스", "청구서", "invoice", "비용"],
  계약: ["계약", "계약서", "임대", "벤더"],
  회의: ["회의", "회의록", "타운홀", "미팅"],
  경비: ["경비", "정산", "비용정산", "경비정산"],
  보안: ["보안", "정보보안", "sop", "보안규정"],
  인사: ["인사", "인사규정", "hr"],
  양식: ["양식", "서식", "폼", "form"],
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
