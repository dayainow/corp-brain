"use client";

import { Eye, FileText, Loader2, MessageSquare, Search } from "lucide-react";
import type { KeywordSearchResult } from "@/lib/search/keyword-vault";
import type { UserRole } from "@/lib/rbac";

const ROLE_BADGE: Record<UserRole, string> = {
  general: "",
  manager: "팀장",
  admin: "관리",
};

interface KeywordSearchResultsProps {
  query: string;
  results: KeywordSearchResult[];
  loading: boolean;
  error: string | null;
  hasSearched: boolean;
  onPreview: (doc: { title: string; fileName: string }) => void;
  onAsk: (doc: { title: string; fileName: string }) => void;
}

export function KeywordSearchResults({
  query,
  results,
  loading,
  error,
  hasSearched,
  onPreview,
  onAsk,
}: KeywordSearchResultsProps) {
  if (!hasSearched && !query.trim()) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 gap-4 py-12">
        <Search className="w-12 h-12 opacity-20" />
        <div className="text-center max-w-md">
          <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
            본문 키워드 검색
          </p>
          <p className="mt-2 text-sm">
            문서 내용에서 단어·구문을 직접 찾습니다. AI 답변 없이 빠르게 문서를
            찾을 때 사용하세요.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        본문 검색 중...
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-8 text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
    );
  }

  if (hasSearched && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400 gap-2">
        <p className="text-sm">「{query}」에 일치하는 문서가 없습니다.</p>
        <p className="text-xs">Sync Vault 후 다시 시도하거나 다른 키워드를 입력해 보세요.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        「{query}」 검색 결과 {results.length}건
      </p>
      {results.map((hit) => {
        const label = hit.title || hit.fileName;
        const fileType = (hit.fileType ?? "").toLowerCase();
        const typeBadge =
          fileType === "pdf" ? "PDF" : fileType === "docx" ? "DOCX" : null;
        const role = hit.role as UserRole | undefined;

        return (
          <article
            key={hit.fileName}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 mt-0.5 shrink-0 text-blue-500" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {label}
                </h3>
                {hit.snippet && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
                    {hit.snippet}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {role && role !== "general" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                      {ROLE_BADGE[role]}
                    </span>
                  )}
                  {typeBadge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500">
                      {typeBadge}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 truncate">{hit.fileName}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => onPreview({ title: label, fileName: hit.fileName })}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-300 dark:hover:bg-blue-950/40 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  보기
                </button>
                <button
                  type="button"
                  onClick={() => onAsk({ title: label, fileName: hit.fileName })}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  AI 질문
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
