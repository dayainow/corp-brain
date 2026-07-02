"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { getSectionsForRole } from "@/lib/guide/content";
import type { UserRole } from "@/lib/rbac";

export default function GuidePage() {
  const { data: session, status } = useSession();
  const userRole = (session?.user?.role ?? "general") as UserRole;
  const sections = getSectionsForRole(userRole);

  if (status === "loading") return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                CorpBrain 사용 매뉴얼
              </h1>
              <p className="text-sm text-slate-500">NovaPay 사내 지식 베이스 이용 가이드</p>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600"
          >
            <ArrowLeft className="w-4 h-4" /> 채팅으로
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-8">
        <section className="p-5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
          <h2 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">빠른 시작</h2>
          <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1.5 list-decimal list-inside">
            <li>채팅 화면에서 사내 문서 관련 질문을 입력합니다.</li>
            <li>답변의 [출처: 파일명] 뱃지로 근거 문서를 확인합니다.</li>
            <li>Manager 이상은 Upload로 새 문서를 추가할 수 있습니다.</li>
            <li>Admin은 Sync Vault로 전체 문서를 재인덱싱합니다.</li>
          </ol>
        </section>

        {sections.map((section) => (
          <section key={section.id} id={section.id}>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
              {section.title}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {section.summary}
            </p>
            <div className="space-y-3">
              {section.items.map((item) => (
                <div
                  key={item.title}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                >
                  <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 text-sm text-slate-600 dark:text-slate-400">
          <p>
            문의: IT 관리팀 · Slack <code className="text-xs bg-slate-200 dark:bg-slate-700 px-1 rounded">#corpbrain-support</code>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            현재 역할: {session?.user?.role ?? "guest"} · {session?.user?.department}
          </p>
        </section>
      </main>
    </div>
  );
}
