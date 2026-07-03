/** 답변 본문에서 [출처: ...] 뱃지 파일명 추출 */
export function extractSourcesFromContent(content: string): string[] {
  const found = new Set<string>();
  for (const match of content.matchAll(/\[출처:\s*([^\]]+)\]/g)) {
    const name = match[1].trim();
    if (name) found.add(name);
  }
  return [...found];
}
