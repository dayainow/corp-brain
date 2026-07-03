"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function displaySourceName(fileName: string): string {
  return fileName.replace(/\.(md|pdf|docx)$/i, "");
}

interface DocumentPreviewModalProps {
  fileName: string | null;
  onClose: () => void;
}

interface PreviewState {
  loading: boolean;
  error: string | null;
  title: string;
  fileType: string;
  content: string;
}

function DocumentPreviewBody({ fileName }: { fileName: string }) {
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
        isMarkdown ? (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-2 [&_ul]:my-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.content}</ReactMarkdown>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {state.content}
          </pre>
        )
      )}
    </div>
  );
}

export function DocumentPreviewModal({ fileName, onClose }: DocumentPreviewModalProps) {
  useEffect(() => {
    if (!fileName) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fileName, onClose]);

  if (!fileName) return null;

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

        <DocumentPreviewBody key={fileName} fileName={fileName} />
      </div>
    </div>
  );
}
