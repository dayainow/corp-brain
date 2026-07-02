"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { LOGIN_GUIDE_ITEMS } from "@/lib/guide/content";

export function LoginGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <BookOpen className="w-4 h-4 text-blue-600" />
          처음이신가요? 사용 안내
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
          {LOGIN_GUIDE_ITEMS.map((item) => (
            <div key={item.title}>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {item.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
