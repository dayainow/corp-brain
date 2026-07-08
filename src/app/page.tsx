"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Send, Database, Loader2, ShieldAlert, Trash2, LogOut, User, CircleHelp, FolderTree, Search } from "lucide-react";
import { ChatMessageContent } from "@/components/chat-message";
import { ChatFeedback } from "@/components/chat-feedback";
import { ChatStreamingStatus } from "@/components/chat-streaming-status";
import { CitationSourceCards } from "@/components/citation-source-cards";
import { extractSourcesFromContent } from "@/lib/chat/sources";
import { DocumentUpload } from "@/components/document-upload";
import { DocumentTree } from "@/components/document-tree";
import { HelpPanel } from "@/components/help-panel";
import { OnboardingBanner } from "@/components/onboarding-banner";
import { FollowUpChips } from "@/components/follow-up-chips";
import { DocumentPreviewModal } from "@/components/document-preview-modal";
import { suggestFollowUpQuestions } from "@/lib/chat/follow-up-suggestions";
import { useVisualViewportHeight } from "@/lib/hooks/use-visual-viewport-height";
import type { DocumentPreviewTarget } from "@/lib/documents/preview-target";
import { QuickStartPrompts } from "@/components/quick-start-prompts";
import { KeywordSearchResults } from "@/components/keyword-search-results";
import type { KeywordSearchResult } from "@/lib/search/keyword-vault";
import type { UserRole } from "@/lib/rbac";
import { extractMessageText } from "@/lib/chat/messages";
import {
  extractRagSourcesFromParts,
  buildSourceHighlightMap,
  type CorpBrainUIMessage,
  type RagStreamPhase,
} from "@/lib/chat/ui-message";

const ROLE_LABELS: Record<UserRole, string> = {
  general: "일반",
  manager: "팀장",
  admin: "관리자",
};

function getMessageText(message: CorpBrainUIMessage): string {
  return extractMessageText(message) ?? "";
}

function resolveStreamPhase(
  status: string,
  ragPhase: RagStreamPhase | null
): RagStreamPhase {
  if (ragPhase) return ragPhase;
  return status === "submitted" ? "searching" : "generating";
}

type MainMode = "chat" | "keyword";

export default function Chat() {
  const { data: session, status: sessionStatus } = useSession();

  const [ragPhase, setRagPhase] = useState<RagStreamPhase | null>(null);

  const { messages, setMessages, status, sendMessage, error } = useChat<CorpBrainUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onData: (part) => {
      if (part.type === "data-rag-status") {
        setRagPhase(part.data.phase);
      }
    },
    onFinish: () => setRagPhase(null),
  });

  const [input, setInput] = useState("");
  const [mainMode, setMainMode] = useState<MainMode>("chat");
  const [keywordResults, setKeywordResults] = useState<KeywordSearchResult[]>([]);
  const [keywordLoading, setKeywordLoading] = useState(false);
  const [keywordError, setKeywordError] = useState<string | null>(null);
  const [keywordHasSearched, setKeywordHasSearched] = useState(false);
  const [activeKeywordQuery, setActiveKeywordQuery] = useState("");

  const runKeywordSearch = async (query: string) => {
    const q = query.trim();
    if (!q) {
      setKeywordResults([]);
      setKeywordError(null);
      setKeywordHasSearched(false);
      setActiveKeywordQuery("");
      return;
    }

    setKeywordLoading(true);
    setKeywordError(null);
    setActiveKeywordQuery(q);

    try {
      const res = await fetch(`/api/documents/search?q=${encodeURIComponent(q)}&limit=20`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "키워드 검색에 실패했습니다.");
      }
      const data = await res.json();
      setKeywordResults(Array.isArray(data.results) ? data.results : []);
      setKeywordHasSearched(true);
    } catch (err) {
      setKeywordResults([]);
      setKeywordHasSearched(true);
      setKeywordError(err instanceof Error ? err.message : "키워드 검색에 실패했습니다.");
    } finally {
      setKeywordLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (mainMode === "keyword") {
      void runKeywordSearch(input);
      return;
    }
    setRagPhase("searching");
    sendMessage({ text: input });
    setInput("");
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chat-session");
      if (saved) {
        try {
          setMessages?.(JSON.parse(saved));
        } catch {
          /* ignore */
        }
      }
    }
  }, [setMessages]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      localStorage.setItem("chat-session", JSON.stringify(messages));
    }
  }, [messages]);

  const isLoading = status !== "ready" && status !== "error";
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexMessage, setIndexMessage] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [treeOpen, setTreeOpen] = useState(false);
  const [treePreview, setTreePreview] = useState<DocumentPreviewTarget | null>(null);

  const userRole = (session?.user?.role ?? "general") as UserRole;
  const isAdmin = userRole === "admin";

  useVisualViewportHeight();

  const handleIndex = async () => {
    setIsIndexing(true);
    setIndexMessage("인덱싱 중입니다...");
    try {
      const res = await fetch("/api/index", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setIndexMessage(`인덱싱 완료! (${data.result.files}개 파일, ${data.result.chunks}개 청크)`);
      } else {
        setIndexMessage(`오류: ${data.error}`);
      }
    } catch {
      setIndexMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setIsIndexing(false);
      setTimeout(() => setIndexMessage(""), 5000);
    }
  };

  const sendFollowUp = (text: string) => {
    setMainMode("chat");
    setRagPhase("searching");
    sendMessage({ text });
  };

  const handleKeywordAsk = (doc: { title: string; fileName: string }) => {
    sendFollowUp(`「${doc.title}」 문서의 주요 내용을 알려줘`);
  };

  if (sessionStatus === "loading") return null;

  return (
    <div className="flex flex-col h-[var(--app-height,100dvh)] max-h-[var(--app-height,100dvh)] overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      <header className="flex shrink-0 justify-between items-center p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">CorpBrain</h1>
          <span className="text-sm px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full ml-2 hidden sm:inline">
            NovaPay Internal KB
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {session?.user && (
            <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">
              <User className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {session.user.name}
              </span>
              <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                {ROLE_LABELS[userRole]}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">
            <ShieldAlert className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500">{session?.user?.department}</span>
          </div>

          {indexMessage && (
            <span className="text-xs sm:text-sm text-green-600 dark:text-green-400 hidden sm:inline">
              {indexMessage}
            </span>
          )}

          <DocumentUpload userRole={userRole} />

          <button
            onClick={() => setTreeOpen(true)}
            className="flex items-center gap-1 px-2 sm:px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-sm transition-colors lg:hidden touch-manipulation"
            title="사내 문서 목록"
            aria-label="사내 문서 목록"
          >
            <FolderTree className="w-4 h-4" />
            <span className="hidden sm:inline">문서</span>
          </button>

          <button
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-1 px-2 sm:px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-sm transition-colors"
            title="사용 가이드"
          >
            <CircleHelp className="w-4 h-4" />
            <span className="hidden sm:inline">도움말</span>
          </button>

          <button
            onClick={() => {
              if (confirm("모든 대화 내역을 지우시겠습니까?")) {
                localStorage.removeItem("chat-session");
                setMessages?.([]);
              }
            }}
            className="flex items-center gap-1 px-2 sm:px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-sm transition-colors"
            title="대화 초기화"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>

          {isAdmin && (
            <>
              <a
                href="/admin"
                className="flex items-center gap-1 px-2 sm:px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-md text-sm transition-colors"
              >
                <ShieldAlert className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </a>
              <button
              onClick={handleIndex}
              disabled={isIndexing}
              className="flex items-center gap-1 px-2 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-md text-sm transition-colors disabled:opacity-50"
            >
              {isIndexing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              <span className="hidden sm:inline">{isIndexing ? "Indexing..." : "Sync Vault"}</span>
            </button>
            </>
          )}

          <button
            onClick={async () => {
              await fetch("/api/auth/audit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "auth.logout" }),
              });
              signOut({ callbackUrl: "/login" });
            }}
            className="flex items-center gap-1 px-2 sm:px-3 py-2 text-slate-500 hover:text-red-600 rounded-md text-sm transition-colors"
            title="로그아웃"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <DocumentTree
          key={userRole}
          userRole={userRole}
          mobileOpen={treeOpen}
          onMobileClose={() => setTreeOpen(false)}
          onPreviewDocument={({ fileName }) => {
            setTreePreview({ fileName });
          }}
          onAskDocument={({ title }) => {
            sendFollowUp(`「${title}」 문서의 주요 내용을 알려줘`);
          }}
        />

        <div className="flex flex-col flex-1 min-w-0">
          <OnboardingBanner
            userRole={userRole}
            userName={session?.user?.name}
            onOpenGuide={() => setHelpOpen(true)}
          />

          <main className="flex-1 overflow-y-auto scrollbar-themed p-4 sm:p-6 w-full max-w-4xl mx-auto flex flex-col gap-6">
        {mainMode === "keyword" ? (
          <KeywordSearchResults
            query={activeKeywordQuery}
            results={keywordResults}
            loading={keywordLoading}
            error={keywordError}
            hasSearched={keywordHasSearched}
            onPreview={({ fileName }) => setTreePreview({ fileName })}
            onAsk={handleKeywordAsk}
          />
        ) : (
          <>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
            답변 생성에 실패했습니다. Ollama가 실행 중인지 확인해 주세요.
          </div>
        )}
        {messages && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 gap-4">
            <Database className="w-12 h-12 opacity-20" />
            <p className="text-center text-lg">
              안녕하세요, {session?.user?.name}님.<br />
              사내 문서에 대해 무엇이든 물어보세요.
            </p>
            <QuickStartPrompts
              userRole={userRole}
              onSelect={(prompt) => {
                setRagPhase("searching");
                sendMessage({ text: prompt });
              }}
            />
          </div>
        ) : (
          messages?.map((m, index) => {
            const prevUser =
              m.role === "assistant"
                ? [...(messages ?? [])]
                    .slice(0, index)
                    .reverse()
                    .find((msg) => msg.role === "user")
                : undefined;
            const prevQuery = prevUser ? getMessageText(prevUser) : undefined;
            const assistantText = m.role === "assistant" ? getMessageText(m) : "";
            const ragSources =
              m.role === "assistant" ? extractRagSourcesFromParts(m.parts) : [];
            const sourceHighlights =
              ragSources.length > 0 ? buildSourceHighlightMap(ragSources) : undefined;
            const assistantSources = assistantText
              ? extractSourcesFromContent(assistantText)
              : ragSources.map((s) => s.fileName);
            const isLastAssistant =
              m.role === "assistant" && index === (messages?.length ?? 0) - 1;
            const showStreamingStatus =
              isLastAssistant && isLoading && !assistantText.trim();

            const showFollowUps =
              isLastAssistant && !isLoading && assistantText.trim();
            const followUpQuestions = showFollowUps
              ? suggestFollowUpQuestions(prevQuery, assistantText, assistantSources)
              : [];

            return (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm border border-slate-100 dark:border-slate-700"
                  }`}
                >
                  {m.role === "user" ? (
                    <div className="whitespace-pre-wrap">{getMessageText(m)}</div>
                  ) : (
                    <>
                      {ragSources.length > 0 && (
                        <CitationSourceCards sources={ragSources} />
                      )}
                      {assistantText.trim() ? (
                        <ChatMessageContent
                          content={assistantText}
                          sourceHighlights={sourceHighlights}
                        />
                      ) : showStreamingStatus ? (
                        <ChatStreamingStatus phase={resolveStreamPhase(status, ragPhase)} />
                      ) : null}
                      {!isLoading && assistantText.trim() && (
                        <ChatFeedback
                          messageId={m.id}
                          query={prevQuery}
                          sources={assistantSources}
                        />
                      )}
                      {showFollowUps && (
                        <FollowUpChips
                          questions={followUpQuestions}
                          onSelect={sendFollowUp}
                          disabled={isLoading}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
        {isLoading && messages?.[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-5 py-3 shadow-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm border border-slate-100 dark:border-slate-700">
              <ChatStreamingStatus phase={resolveStreamPhase(status, ragPhase)} />
            </div>
          </div>
        )}
          </>
        )}
          </main>

          <footer className="shrink-0 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <div className="w-full max-w-4xl mx-auto mb-2">
              <div
                className="inline-flex rounded-full border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800"
                role="tablist"
                aria-label="메인 검색 모드"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mainMode === "chat"}
                  onClick={() => setMainMode("chat")}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors ${
                    mainMode === "chat"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  AI 질문
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mainMode === "keyword"}
                  onClick={() => setMainMode("keyword")}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-colors ${
                    mainMode === "keyword"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  본문 검색
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto flex items-center relative">
              <input
                className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-full pl-5 sm:pl-6 pr-14 py-3 sm:py-4 text-base text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                value={input}
                placeholder={
                  mainMode === "chat"
                    ? "사내 문서와 관련된 질문을 입력하세요..."
                    : "본문에서 찾을 키워드를 입력하세요..."
                }
                onChange={(e) => setInput(e.target.value)}
                disabled={mainMode === "chat" && isLoading}
              />
              <button
                type="submit"
                disabled={
                  !input.trim() ||
                  (mainMode === "chat" && isLoading) ||
                  (mainMode === "keyword" && keywordLoading)
                }
                className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation"
                aria-label={mainMode === "chat" ? "질문 전송" : "본문 검색"}
              >
                {mainMode === "keyword" && keywordLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : mainMode === "keyword" ? (
                  <Search className="w-5 h-5" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </footer>
        </div>
      </div>

      <HelpPanel
        key={helpOpen ? "open" : "closed"}
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        userRole={userRole}
      />

      <DocumentPreviewModal
        target={treePreview}
        onClose={() => setTreePreview(null)}
      />
    </div>
  );
}
