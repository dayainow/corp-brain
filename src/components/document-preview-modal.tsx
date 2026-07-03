"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Loader2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { findChunkHighlightRange } from "@/lib/documents/highlight-chunk";
import type { DocumentPreviewTarget } from "@/lib/documents/preview-target";
import { displaySourceName } from "@/lib/chat/ui-message";

interface DocumentPreviewModalProps {
  target: DocumentPreviewTarget | null;
  onClose: () => void;
}

interface PreviewState {
  loading: boolean;
  error: string | null;
  title: string;
  fileType: string;
  content: string;
}

function ChunkFallbackBanner({ text }: { text: string }) {
  return (
    <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2">
      <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
        검색된 구간 (원문 본문에서 정확히 찾지 못함)
      </p>
      <p className="mt-1 text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap leading-relaxed">
        {text}
      </p>
    </div>
  );
}

function HighlightedMarkdown({
  content,
  range,
  highlightRef,
}: {
  content: string;
  range: { start: number; end: number };
  highlightRef: React.RefObject<HTMLElement | null>;
}) {
  const before = content.slice(0, range.start);
  const highlight = content.slice(range.start, range.end);
  const after = content.slice(range.end);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-2 [&_ul]:my-2">
      {before.trim() ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{before}</ReactMarkdown> : null}
      <div className="my-3 rounded-lg border-2 border-yellow-400/80 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-950/50 px-3 py-2 scroll-mt-4">
        <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-1.5 not-prose">
          검색된 구간
        </p>
        <mark
          ref={highlightRef}
          className="block whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800 dark:text-slate-100 bg-transparent not-prose"
        >
          {highlight}
        </mark>
      </div>
      {after.trim() ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{after}</ReactMarkdown> : null}
    </div>
  );
}

function HighlightedPlainText({
  content,
  range,
  highlightRef,
}: {
  content: string;
  range: { start: number; end: number };
  highlightRef: React.RefObject<HTMLElement | null>;
}) {
  const before = content.slice(0, range.start);
  const highlight = content.slice(range.start, range.end);
  const after = content.slice(range.end);

  return (
    <div>
      <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
        검색된 구간
      </p>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
        {before}
        <mark
          ref={highlightRef}
          className="rounded-sm bg-yellow-200 dark:bg-yellow-700/60 text-slate-900 dark:text-slate-50 px-0.5 scroll-mt-4"
        >
          {highlight}
        </mark>
        {after}
      </pre>
    </div>
  );
}

function DocumentPreviewBody({
  fileName,
  highlightText,
}: {
  fileName: string;
  highlightText?: string;
}) {
  const highlightRef = useRef<HTMLElement>(null);
  const [state, setState] = useState<PreviewState>({
    loading: true,
    error: null,
    title: "",
    fileType: "",
    content: "",
  });

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/documents/content?fileName=${encodeURIComponent(fileName)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error ?? "문서를 불러오지 못했습니다.");
        }
        return data as { title: string; fileType: string; content: string };
      })
      .then((data) => {
        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          title: data.title,
          fileType: data.fileType,
          content: data.content,
        });
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setState({
            loading: false,
            error: err.message,
            title: "",
            fileType: "",
            content: "",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fileName]);

  const highlightRange = useMemo(() => {
    if (!state.content || !highlightText?.trim()) return null;
    return findChunkHighlightRange(state.content, highlightText);
  }, [state.content, highlightText]);

  useEffect(() => {
    if (!highlightRange || state.loading) return;
    const timer = window.setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [highlightRange, state.loading, fileName]);

  const isMarkdown = state.fileType === "md" || state.fileType === "markdown";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-themed p-4 text-sm text-slate-700 dark:text-slate-300">
      {state.loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          원문 불러오는 중...
        </div>
      )}
      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400 py-4">{state.error}</p>
      )}
      {!state.loading && !state.error && state.content && (
        <>
          {highlightText && !highlightRange && (
            <ChunkFallbackBanner text={highlightText} />
          )}
          {highlightRange ? (
            isMarkdown ? (
              <HighlightedMarkdown
                content={state.content}
                range={highlightRange}
                highlightRef={highlightRef}
              />
            ) : (
              <HighlightedPlainText
                content={state.content}
                range={highlightRange}
                highlightRef={highlightRef}
              />
            )
          ) : isMarkdown ? (
            <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-2 [&_ul]:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.content}</ReactMarkdown>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {state.content}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

export function DocumentPreviewModal({ target, onClose }: DocumentPreviewModalProps) {
  useEffect(() => {
    if (!target) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [target, onClose]);

  if (!target) return null;

  const { fileName, highlightText } = target;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex flex-col w-full max-w-2xl max-h-[min(85vh,720px)] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-preview-title"
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-start gap-2 min-w-0">
            <FileText className="w-5 h-5 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0">
              <h2
                id="document-preview-title"
                className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate"
              >
                {displaySourceName(fileName)}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {fileName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="원문 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <DocumentPreviewBody
          key={`${fileName}:${highlightText ?? ""}`}
          fileName={fileName}
          highlightText={highlightText}
        />
      </div>
    </div>
  );
}
