"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Database } from "lucide-react";
import { DocumentPreviewModal } from "@/components/document-preview-modal";

function displaySourceName(fileName: string): string {
  return fileName.replace(/\.(md|pdf|docx)$/i, "");
}

function CitationBadge({
  sourceName,
  onPreview,
}: {
  sourceName: string;
  onPreview: (fileName: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPreview(sourceName)}
      className="inline-flex items-center gap-1 px-2 py-0.5 ml-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors cursor-pointer"
      title={`${displaySourceName(sourceName)} 원문 보기`}
      aria-label={`${displaySourceName(sourceName)} 원문 보기`}
    >
      <Database className="w-3 h-3" />
      {displaySourceName(sourceName)}
    </button>
  );
}

/** 마크다운 + [출처: ...] 뱃지를 함께 렌더링 */
export function ChatMessageContent({ content }: { content: string }) {
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const parts = content.split(/(\[출처:\s*[^\]]+\])/g);

  return (
    <>
      <div className="text-sm leading-relaxed [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_code]:bg-slate-100 [&_code]:dark:bg-slate-700 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-slate-100 [&_pre]:dark:bg-slate-700 [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto">
        {parts.map((part, index) => {
          if (part.startsWith("[출처:")) {
            const sourceName = part.replace("[출처:", "").replace("]", "").trim();
            return (
              <CitationBadge
                key={index}
                sourceName={sourceName}
                onPreview={setPreviewFileName}
              />
            );
          }
          if (!part.trim()) return null;
          return (
            <ReactMarkdown key={index} remarkPlugins={[remarkGfm]}>
              {part}
            </ReactMarkdown>
          );
        })}
      </div>
      <DocumentPreviewModal
        fileName={previewFileName}
        onClose={() => setPreviewFileName(null)}
      />
    </>
  );
}
