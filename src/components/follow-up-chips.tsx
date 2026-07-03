"use client";

import { MessageCircle } from "lucide-react";

interface FollowUpChipsProps {
  questions: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function FollowUpChips({ questions, onSelect, disabled }: FollowUpChipsProps) {
  if (questions.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
        <MessageCircle className="w-3.5 h-3.5" />
        이어서 물어보기
      </p>
      <div className="flex flex-wrap gap-2">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(question)}
            className="px-2.5 py-1.5 text-xs rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
