"use client";

import { MessageSquare } from "lucide-react";
import type { UserRole } from "@/lib/rbac";
import { QUICK_START_PROMPTS } from "@/lib/guide/content";

interface QuickStartPromptsProps {
  userRole: UserRole;
  onSelect: (prompt: string) => void;
}

export function QuickStartPrompts({ userRole, onSelect }: QuickStartPromptsProps) {
  const prompts = QUICK_START_PROMPTS[userRole];

  return (
    <div className="w-full max-w-lg mt-2">
      <p className="text-xs text-slate-400 mb-3 flex items-center justify-center gap-1">
        <MessageSquare className="w-3.5 h-3.5" />
        예시 질문을 눌러 바로 시작해 보세요
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onSelect(prompt)}
            className="px-3 py-2 text-sm rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
