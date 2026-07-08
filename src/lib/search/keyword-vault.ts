import { isDocumentExpired } from "@/lib/audit/siem";
import { keywordScore } from "@/lib/search/hybrid-core";
import { expandKoreanTokens, normalizeKoreanQuery } from "@/lib/search/korean-query";
import type { UserRole } from "@/lib/rbac";
import { getVectorStore } from "@/lib/vector-store";
import type { VectorDocument } from "@/lib/vector-store/types";

export interface KeywordSearchResult {
  fileName: string;
  title: string;
  role?: string;
  fileType?: string;
  score: number;
  snippet: string;
}

function documentSearchText(doc: VectorDocument): string {
  const fileName = String(doc.metadata.fileName ?? "");
  const title = String(doc.metadata.title ?? "");
  return `${fileName} ${title} ${doc.text}`;
}

/** 청크·메타데이터에 대한 키워드 점수 (임베딩 없음) */
export function scoreKeywordDocument(query: string, doc: VectorDocument): number {
  const q = normalizeKoreanQuery(query);
  const tokens = expandKoreanTokens(query);
  const text = doc.text.toLowerCase();
  const fileName = String(doc.metadata.fileName ?? "").toLowerCase();
  const title = String(doc.metadata.title ?? "").toLowerCase();
  const stem = fileName.replace(/\.(md|markdown|pdf|docx)$/i, "");

  let score = keywordScore(query, documentSearchText(doc));
  if (score === 0) return 0;

  if (q.length > 2 && text.includes(q)) score += 5;
  for (const token of tokens) {
    if (fileName.includes(token) || stem.includes(token)) score += 2;
    if (title.includes(token)) score += 1.5;
  }

  return score;
}

/** 검색어 주변 텍스트 스니펫 */
export function buildKeywordSnippet(
  text: string,
  query: string,
  maxLen = 140
): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const tokens = expandKoreanTokens(query).filter((t) => t.length > 0);
  const lower = normalized.toLowerCase();
  let matchIndex = -1;

  for (const token of tokens) {
    const idx = lower.indexOf(token.toLowerCase());
    if (idx >= 0 && (matchIndex < 0 || idx < matchIndex)) {
      matchIndex = idx;
    }
  }

  if (matchIndex < 0) {
    return normalized.length <= maxLen
      ? normalized
      : `${normalized.slice(0, maxLen - 1)}…`;
  }

  const half = Math.floor(maxLen / 2);
  const start = Math.max(0, matchIndex - half);
  const end = Math.min(normalized.length, start + maxLen);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < normalized.length ? "…" : "";
  return `${prefix}${normalized.slice(start, end)}${suffix}`;
}

function fileTitle(doc: VectorDocument): string {
  const title = doc.metadata.title;
  if (typeof title === "string" && title.trim()) return title.trim();
  const fileName = String(doc.metadata.fileName ?? "");
  return fileName.replace(/\.(md|markdown|pdf|docx)$/i, "") || fileName;
}

function fileTypeFromName(fileName: string): string | undefined {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf" || ext === "docx" || ext === "md" || ext === "markdown") {
    return ext === "markdown" ? "md" : ext;
  }
  return undefined;
}

/** 인덱스 청크 기반 키워드 검색 (RBAC·만료 필터, 파일 단위 집계) */
export async function searchVaultByKeyword(
  query: string,
  userRole: UserRole,
  limit = 20
): Promise<KeywordSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const store = getVectorStore();
  const chunks = (await store.getAccessibleDocuments(userRole)).filter(
    (doc) => !isDocumentExpired(doc.metadata)
  );

  const bestByFile = new Map<
    string,
    { doc: VectorDocument; score: number }
  >();

  for (const doc of chunks) {
    const score = scoreKeywordDocument(trimmed, doc);
    if (score <= 0) continue;

    const fileName = String(doc.metadata.fileName ?? "");
    if (!fileName) continue;

    const prev = bestByFile.get(fileName);
    if (!prev || score > prev.score) {
      bestByFile.set(fileName, { doc, score });
    }
  }

  return [...bestByFile.entries()]
    .map(([fileName, { doc, score }]) => ({
      fileName,
      title: fileTitle(doc),
      role: typeof doc.metadata.role === "string" ? doc.metadata.role : undefined,
      fileType: fileTypeFromName(fileName),
      score,
      snippet: buildKeywordSnippet(doc.text, trimmed),
    }))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "ko"))
    .slice(0, limit);
}
