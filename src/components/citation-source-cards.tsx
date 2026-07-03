"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import type { RagSourceCard } from "@/lib/chat/ui-message";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import type { DocumentPreviewTarget } from "@/lib/documents/preview-target";

interface CitationSourceCardsProps {
  sources: RagSourceCard[];
  compact?: boolean;
}

export function CitationSourceCards({ sources, compact = false }: CitationSourceCardsProps) {
  const [previewTarget, setPreviewTarget] = useState<DocumentPreviewTarget | null>(null);

  if (sources.length === 0) return null;

  return (
    <>
      <div
        className={`mb-3 ${compact ? "" : "pb-3 border-b border-slate-100 dark:border-slate-700"}`}
        aria-label="참고 문서"
      >
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
          참고 문서 {sources.length}건
        </p>
        <ul className="flex flex-col gap-2">
          {sources.map((source) => (
            <li key={source.fileName}>
              <button
                type="button"
                onClick={() =>
                  setPreviewTarget({
                    fileName: source.fileName,
                    highlightText: source.chunkText,
                  })
                }
                className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 transition-colors group"
                title={`${source.displayName} 원문 보기 (검색 구간 하이라이트)`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-blue-500" />
                  <span className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">
                    {source.displayName}
                  </span>
                </span>
                {source.snippet && (
                  <span className="block mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {source.snippet}
                    {source.snippet.length >= 120 ? "…" : ""}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <DocumentPreviewModal
        target={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </>
  );
}
