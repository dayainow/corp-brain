"use client";

import { useEffect, useState } from "react";
import { X, BookOpen, ChevronRight } from "lucide-react";
import type { UserRole } from "@/lib/rbac";
import {
  getSectionsForRole,
  type GuideSectionId,
} from "@/lib/guide/content";

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
  userRole: UserRole;
  initialSection?: GuideSectionId;
}

export function HelpPanel({
  open,
  onClose,
  userRole,
  initialSection = "start",
}: HelpPanelProps) {
  const sections = getSectionsForRole(userRole);
  const [activeId, setActiveId] = useState<GuideSectionId>(initialSection);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const active = sections.find((s) => s.id === activeId) ?? sections[0];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              사용 가이드
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <nav className="w-36 shrink-0 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-2 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveId(section.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                  active?.id === section.id
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {section.title}
                {active?.id === section.id && <ChevronRight className="w-3 h-3" />}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto p-5">
            {active && (
              <>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-1">
                  {active.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                  {active.summary}
                </p>
                <div className="space-y-4">
                  {active.items.map((item) => (
                    <div
                      key={item.title}
                      className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700"
                    >
                      <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-1.5">
                        {item.title}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="p-3 border-t border-slate-200 dark:border-slate-800 text-center">
          <a
            href="/guide"
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            전체 매뉴얼 페이지 보기 →
          </a>
        </footer>
      </div>
    </div>
  );
}
