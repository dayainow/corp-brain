"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Database,
  FileText,
  Shield,
  Activity,
  ArrowLeft,
  Loader2,
  CircleHelp,
  ThumbsUp,
} from "lucide-react";
import type { AuditEntry } from "@/lib/audit";
import type { FeedbackStats } from "@/lib/audit/feedback-stats";

interface DocStats {
  totalDocuments: number;
  totalChunks: number;
  byRole: Record<string, number>;
}

interface DocInfo {
  fileName: string;
  path: string;
  role: string;
  title: string;
  size: number;
}

interface SearchMetrics {
  hitAt1: number;
  hitAt3: number;
  mrr: number;
  queryCount: number;
  targetHitAt3: number;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [docs, setDocs] = useState<DocInfo[]>([]);
  const [stats, setStats] = useState<DocStats | null>(null);
  const [searchMetrics, setSearchMetrics] = useState<SearchMetrics | null>(null);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [feedbackHint, setFeedbackHint] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (session?.user?.role !== "admin") return;

    Promise.all([
      fetch("/api/admin/audit?limit=50").then((r) => r.json()),
      fetch("/api/admin/documents").then((r) => r.json()),
    ])
      .then(([auditData, docData]) => {
        setLogs(auditData.logs ?? []);
        setDocs(docData.documents ?? []);
        setStats(docData.stats ?? null);
      })
      .finally(() => setLoading(false));

    fetch("/api/admin/metrics")
      .then((r) => r.json())
      .then((metricsData) => setSearchMetrics(metricsData.metrics ?? null))
      .catch(() => setSearchMetrics(null));

    fetch("/api/admin/feedback")
      .then((r) => r.json())
      .then((data) => {
        setFeedbackStats(data.stats ?? null);
        setFeedbackHint(data.hint ?? "");
      })
      .catch(() => setFeedbackStats(null));
  }, [session, status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (session?.user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Admin 권한이 필요합니다.
      </div>
    );
  }

  const ACTION_LABELS: Record<string, string> = {
    "chat.query": "질의",
    "chat.feedback": "피드백",
    "index.sync": "인덱싱",
    "document.upload": "업로드",
    "auth.login": "로그인",
    "auth.logout": "로그아웃",
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
            <span className="text-sm text-slate-400">NovaPay CorpBrain</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/guide"
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700"
            >
              <CircleHelp className="w-4 h-4" /> 운영 가이드
            </Link>
            <Link href="/" className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600">
              <ArrowLeft className="w-4 h-4" /> 채팅으로
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<FileText className="w-5 h-5" />} label="문서 수" value={stats.totalDocuments} />
            <StatCard icon={<Database className="w-5 h-5" />} label="청크 수" value={stats.totalChunks} />
            <StatCard icon={<Shield className="w-5 h-5" />} label="Admin 문서" value={stats.byRole.admin ?? 0} />
            <StatCard icon={<Activity className="w-5 h-5" />} label="감사 로그" value={logs.length} />
          </div>
        )}

        {searchMetrics && (
          <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h2 className="font-semibold mb-3">검색 품질 메트릭 (Re-ranking 적용)</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{(searchMetrics.hitAt3 * 100).toFixed(0)}%</div>
                <div className="text-xs text-slate-500">Hit@3 (목표 80%)</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{(searchMetrics.hitAt1 * 100).toFixed(0)}%</div>
                <div className="text-xs text-slate-500">Hit@1</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{searchMetrics.mrr.toFixed(2)}</div>
                <div className="text-xs text-slate-500">MRR</div>
              </div>
            </div>
          </section>
        )}

        {feedbackStats && (
          <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-green-600" />
              파일럿 피드백 (👍/👎)
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div>
                <div className="text-2xl font-bold text-green-600">{feedbackStats.up}</div>
                <div className="text-xs text-slate-500">👍 up</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{feedbackStats.down}</div>
                <div className="text-xs text-slate-500">👎 down</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {feedbackStats.total > 0
                    ? `${(feedbackStats.downRate * 100).toFixed(0)}%`
                    : "—"}
                </div>
                <div className="text-xs text-slate-500">down 비율</div>
              </div>
            </div>
            {feedbackStats.topDownQueries.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  👎 Top 질문
                </h3>
                {feedbackStats.topDownQueries.map((q) => (
                  <div
                    key={q.query}
                    className="text-sm p-2 rounded bg-slate-50 dark:bg-slate-800 flex justify-between gap-2"
                  >
                    <span className="font-medium truncate">{q.query}</span>
                    <span className="text-slate-400 shrink-0">{q.count}건</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">{feedbackHint || "피드백이 아직 없습니다."}</p>
            )}
            <p className="text-xs text-slate-400 mt-3">
              CLI: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">npm run report:feedback</code>
            </p>
          </section>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> 최근 감사 로그
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-themed">
              {logs.length === 0 ? (
                <p className="text-sm text-slate-400">로그가 없습니다.</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="text-xs p-2 rounded bg-slate-50 dark:bg-slate-800">
                    <div className="flex justify-between">
                      <span className="font-medium text-blue-600">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                      <span className="text-slate-400">
                        {new Date(log.timestamp).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    <div className="text-slate-500 mt-1">
                      {log.userEmail} ({log.userRole})
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" /> 문서 목록
            </h2>
            <div className="space-y-1 max-h-96 overflow-y-auto scrollbar-themed">
              {docs.map((doc) => (
                <div key={doc.path} className="flex items-center justify-between text-sm p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                  <div>
                    <span className="font-medium">{doc.title}</span>
                    <span className="text-xs text-slate-400 ml-2">{doc.fileName}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    doc.role === "admin" ? "bg-red-100 text-red-700" :
                    doc.role === "manager" ? "bg-yellow-100 text-yellow-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {doc.role}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center gap-2 text-slate-500 mb-1">{icon}<span className="text-sm">{label}</span></div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
