"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useEffect } from "react";
import { Send, Database, Loader2, ShieldAlert, Trash2 } from "lucide-react";

// Helper function to render text with citation badges
function renderMessageWithCitations(text: string) {
  // Split by [출처: ...]
  const parts = text.split(/(\[출처:\s*[^\]]+\])/g);
  
  return parts.map((part, index) => {
    if (part.startsWith("[출처:")) {
      const sourceName = part.replace("[출처:", "").replace("]", "").trim();
      return (
        <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 ml-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-200 transition-colors">
          <Database className="w-3 h-3" />
          {sourceName}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export default function Chat() {
  const [role, setRole] = useState("general");
  const [initialLoaded, setInitialLoaded] = useState(false);

  const chatState = useChat({
    // @ts-ignore
    api: `/api/chat?role=${role}`
  }) as any;
  const { messages, setMessages, status } = chatState;
  
  // LOG THE KEYS OF chatState to the console so we can see what it actually exports!
  useEffect(() => {
    console.log("chatState keys:", Object.keys(chatState));
  }, []);

  const [input, setInput] = useState("");
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // Fallbacks for different versions of ai-sdk
    if (typeof chatState.append === 'function') {
      chatState.append({ content: input, role: 'user' });
    } else if (typeof chatState.sendMessage === 'function') {
      chatState.sendMessage({ content: input, role: 'user' });
    } else {
      console.error("Chat hook doesn't have an append or sendMessage function. Keys:", Object.keys(chatState));
    }
    setInput("");
  };

  // Restore messages on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chat-session");
      if (saved) {
        try {
          setMessages?.(JSON.parse(saved));
        } catch (e) {}
      }
    }
    setInitialLoaded(true);
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages && messages.length > 0) {
      localStorage.setItem("chat-session", JSON.stringify(messages));
    }
  }, [messages]);

  const isLoading = status !== "ready" && status !== "error";

  const [isIndexing, setIsIndexing] = useState(false);
  const [indexMessage, setIndexMessage] = useState("");

  const handleIndex = async () => {
    setIsIndexing(true);
    setIndexMessage("인덱싱 중입니다...");
    try {
      const res = await fetch("/api/index", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setIndexMessage(`인덱싱 완료! (${data.result.files}개 파일, ${data.result.chunks}개 청크)`);
      } else {
        setIndexMessage(`오류 발생: ${data.error}`);
      }
    } catch (err) {
      setIndexMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setIsIndexing(false);
      setTimeout(() => setIndexMessage(""), 5000);
    }
  };

  if (!initialLoaded) return null; // Avoid hydration mismatch

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">CorpBrain</h1>
          <span className="text-sm px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full ml-2">
            Internal Knowledge Base
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700">
            <ShieldAlert className="w-4 h-4 text-slate-500" />
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              className="bg-transparent text-sm text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="general">일반 권한 (General)</option>
              <option value="manager">팀장 권한 (Manager)</option>
              <option value="admin">최고 관리자 (Admin)</option>
            </select>
          </div>

          {indexMessage && <span className="text-sm text-green-600 dark:text-green-400">{indexMessage}</span>}
          <button 
            onClick={() => {
              if (confirm("모든 대화 내역을 지우시겠습니까?")) {
                localStorage.removeItem("chat-session");
                chatState.setMessages?.([]);
              }
            }}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-sm transition-colors"
            title="대화 초기화"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          <button 
            onClick={handleIndex} 
            disabled={isIndexing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isIndexing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {isIndexing ? "Indexing..." : "Sync Vault"}
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 w-full max-w-4xl mx-auto flex flex-col gap-6">
        {messages && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 gap-4">
            <Database className="w-12 h-12 opacity-20" />
            <p className="text-center text-lg">
              사내 문서에 대해 무엇이든 물어보세요.<br/>
              (예: "우리 회사 휴가 규정이 어떻게 돼?")
            </p>
          </div>
        ) : (
          messages && messages.map((m: any) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-sm' 
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm border border-slate-100 dark:border-slate-700 leading-relaxed'
                }`}
              >
                <div className="whitespace-pre-wrap">
                  {m.role === 'user' ? m.content : renderMessageWithCitations(m.content)}
                </div>
              </div>
            </div>
          ))
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

      {/* Input Area */}
      <footer className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto flex items-center relative">
          <input
            className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-full pl-6 pr-14 py-4 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
            value={input}
            placeholder="사내 문서와 관련된 질문을 입력하세요..."
            onChange={handleInputChange}
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
  );
}
