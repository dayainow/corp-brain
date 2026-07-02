"use client";

import { useState } from "react";
import { Lightbulb, X } from "lucide-react";
import type { UserRole } from "@/lib/rbac";

const STORAGE_KEY = "corpbrain-onboarding-dismissed";

interface OnboardingBannerProps {
  userRole: UserRole;
  userName?: string;
  onOpenGuide: () => void;
}

const ROLE_TIPS: Record<UserRole, string> = {
  general: "휴가·재택·출장 규정 등 전사 공통 문서를 질문해 보세요.",
  manager: "분기 실적·경비 문서도 검색할 수 있습니다. Upload로 새 문서를 추가하세요.",
  admin: "Sync Vault로 문서를 인덱싱하고, Admin 대시보드에서 운영 현황을 확인하세요.",
};

export function OnboardingBanner({ userRole, userName, onOpenGuide }: OnboardingBannerProps) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(STORAGE_KEY);
  });

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mx-4 mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex gap-3">
      <Lightbulb className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
          {userName ? `${userName}님, ` : ""}CorpBrain에 오신 것을 환영합니다!
        </p>
        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
          {ROLE_TIPS[userRole]}
        </p>
        <button
          onClick={onOpenGuide}
          className="text-sm text-blue-600 dark:text-blue-400 underline mt-2 hover:no-underline"
        >
          사용 가이드 보기
        </button>
      </div>
      <button
        onClick={dismiss}
        className="text-blue-400 hover:text-blue-600 shrink-0"
        aria-label="닫기"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
