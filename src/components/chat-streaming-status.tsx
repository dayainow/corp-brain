"use client";

import { Loader2, Search, Sparkles } from "lucide-react";
import type { RagStreamPhase } from "@/lib/chat/ui-message";

const PHASE_COPY: Record<
  RagStreamPhase,
  { label: string; icon: typeof Search }
> = {
  searching: { label: "사내 문서를 검색하고 있습니다…", icon: Search },
  generating: { label: "답변을 생성하고 있습니다…", icon: Sparkles },
};

export function ChatStreamingStatus({ phase }: { phase: RagStreamPhase }) {
  const { label, icon: Icon } = PHASE_COPY[phase];

  return (
    <div
      className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
      <Icon className="w-4 h-4 text-blue-500 shrink-0" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
