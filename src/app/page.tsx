"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Send, Database, Loader2, ShieldAlert, Trash2, LogOut, User, CircleHelp, FolderTree } from "lucide-react";
import { ChatMessageContent } from "@/components/chat-message";
import { ChatFeedback } from "@/components/chat-feedback";
import { extractSourcesFromContent } from "@/lib/chat/sources";
import { DocumentUpload } from "@/components/document-upload";
import { DocumentTree } from "@/components/document-tree";
import { HelpPanel } from "@/components/help-panel";
import { OnboardingBanner } from "@/components/onboarding-banner";
import { QuickStartPrompts } from "@/components/quick-start-prompts";
import type { UserRole } from "@/lib/rbac";
import { extractMessageText } from "@/lib/chat/messages";

const ROLE_LABELS: Record<UserRole, string> = {
  general: "일반",
  manager: "팀장",
  admin: "관리자",
};

function getMessageText(message: UIMessage): string {
  return extractMessageText(message) ?? "";
}

export default function Chat() {
  const { data: session, status: sessionStatus } = useSession();

  const { messages, setMessages, status, sendMessage, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
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

  const userRole = (session?.user?.role ?? "general") as UserRole;
  const isAdmin = userRole === "admin";

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

  if (sessionStatus === "loading") return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
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
            className="flex items-center gap-1 px-2 sm:px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-sm transition-colors lg:hidden"
            title="사내 문서 목록"
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
          onSelectDocument={({ title }) => {
            sendMessage({
              text: `「${title}」 문서의 주요 내용을 알려줘`,
            });
          }}
        />

        <div className="flex flex-col flex-1 min-w-0">
          <OnboardingBanner
            userRole={userRole}
            userName={session?.user?.name}
            onOpenGuide={() => setHelpOpen(true)}
          />

          <main className="flex-1 overflow-y-auto scrollbar-themed p-4 sm:p-6 w-full max-w-4xl mx-auto flex flex-col gap-6">
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
              onSelect={(prompt) => sendMessage({ text: prompt })}
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
            const assistantSources =
              m.role === "assistant" ? extractSourcesFromContent(getMessageText(m)) : [];

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
                      <ChatMessageContent content={getMessageText(m)} />
                      <ChatFeedback
                        messageId={m.id}
                        query={prevQuery}
                        sources={assistantSources}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-5 py-3 shadow-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>답변을 생성하고 있습니다...</span>
            </div>
          </div>
        )}
          </main>

          <footer className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto flex items-center relative">
              <input
                className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-full pl-6 pr-14 py-4 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                value={input}
                placeholder="사내 문서와 관련된 질문을 입력하세요..."
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Send className="w-5 h-5" />
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
    </div>
  );
}
