"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderTree,
  Eye,
  Loader2,
  MessageSquare,
  Search,
  X,
} from "lucide-react";
import type { UserRole } from "@/lib/rbac";
import {
  collectFolderIds,
  countVaultFiles,
  filterVaultTree,
} from "@/lib/vault/tree-filter";
import type { VaultTreeNode } from "@/lib/vault/types";

const ROLE_BADGE: Record<UserRole, string> = {
  general: "",
  manager: "팀장",
  admin: "관리",
};

interface TreeStats {
  visibleCount: number;
  byRole: Record<UserRole, number>;
}

interface DocumentTreeProps {
  userRole: UserRole;
  onPreviewDocument: (doc: { title: string; fileName: string }) => void;
  onAskDocument: (doc: { title: string; fileName: string }) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  onPreviewDocument,
  onAskDocument,
}: {
  node: VaultTreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onPreviewDocument: (doc: { title: string; fileName: string }) => void;
  onAskDocument: (doc: { title: string; fileName: string }) => void;
}) {
  if (node.type === "file") {
    const label = node.title ?? node.name;
    const fileName = node.fileName ?? node.name;
    const fileType = (node.fileType ?? "").toLowerCase();
    const typeBadge =
      fileType === "pdf" ? "PDF" : fileType === "docx" ? "DOCX" : null;

    return (
      <div
        className="group w-full flex items-start gap-1 px-2 py-1.5 rounded-md text-sm text-slate-700 dark:text-slate-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 min-w-0"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <FileText className="w-4 h-4 mt-0.5 shrink-0 text-slate-400 group-hover:text-blue-500" />
        <span className="flex-1 min-w-0">
          <span className="block truncate" title={label}>
            {label}
          </span>
          <span className="flex flex-wrap items-center gap-1 mt-0.5">
            {node.role && node.role !== "general" && (
              <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                {ROLE_BADGE[node.role]}
              </span>
            )}
            {typeBadge && (
              <span className="text-[10px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                {typeBadge}
              </span>
            )}
          </span>
        </span>
        <div className="flex shrink-0 gap-0.5 mt-0.5">
          <button
            type="button"
            onClick={() => onPreviewDocument({ title: label, fileName })}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 dark:hover:text-blue-300 transition-colors"
            title={`${label} 원문 보기`}
            aria-label={`${label} 원문 보기`}
          >
            <Eye className="w-3 h-3" />
            <span className="hidden sm:inline">보기</span>
          </button>
          <button
            type="button"
            onClick={() => onAskDocument({ title: label, fileName })}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 dark:hover:text-blue-300 transition-colors"
            title={`${label} 문서로 질문`}
            aria-label={`${label}로 질문`}
          >
            <MessageSquare className="w-3 h-3" />
            <span className="hidden sm:inline">질문</span>
          </button>
        </div>
      </div>
    );
  }

  const isOpen = expanded.has(node.id);
  const hasChildren = (node.children?.length ?? 0) > 0;
  if (!hasChildren) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(node.id)}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-0"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0" />
        )}
        <Folder className="w-4 h-4 shrink-0 text-slate-400" />
        <span className="truncate">{node.name === "vault" ? "사내 문서" : node.name}</span>
        <span className="ml-auto text-xs text-slate-400">{node.children?.length}</span>
      </button>
      {isOpen &&
        node.children?.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            onPreviewDocument={onPreviewDocument}
            onAskDocument={onAskDocument}
          />
        ))}
    </div>
  );
}

function TreePanel({
  tree,
  stats,
  loading,
  error,
  onPreviewDocument,
  onAskDocument,
  onClose,
  showClose,
}: {
  tree: VaultTreeNode | null;
  stats: TreeStats | null;
  loading: boolean;
  error: string | null;
  onPreviewDocument: (doc: { title: string; fileName: string }) => void;
  onAskDocument: (doc: { title: string; fileName: string }) => void;
  onClose?: () => void;
  showClose?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    tree ? new Set(collectFolderIds(tree)) : new Set()
  );

  const filteredTree = useMemo(() => {
    if (!tree) return null;
    if (!searchQuery.trim()) return tree;
    return filterVaultTree(tree, searchQuery);
  }, [tree, searchQuery]);

  const matchCount = useMemo(() => {
    if (!searchQuery.trim() || !filteredTree) return 0;
    return countVaultFiles(filteredTree);
  }, [searchQuery, filteredTree]);

  const effectiveExpanded = useMemo(() => {
    if (searchQuery.trim() && filteredTree) {
      return new Set(collectFolderIds(filteredTree));
    }
    return expanded;
  }, [searchQuery, filteredTree, expanded]);

  const onToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!showClose || loading) return;
    searchInputRef.current?.focus();
  }, [showClose, loading]);

  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FolderTree className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              사내 문서
            </h2>
            {stats && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                열람 가능 {stats.visibleCount}건
              </p>
            )}
          </div>
        </div>
        {showClose && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            aria-label="문서 트리 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="shrink-0 px-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="문서 이름 검색..."
            className="w-full pl-8 pr-8 py-1.5 text-base sm:text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            aria-label="문서 이름 검색"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              aria-label="검색어 지우기"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {searchQuery.trim() && !loading && (
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            {matchCount > 0 ? `${matchCount}건 일치` : "일치하는 문서 없음"}
          </p>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-2 scrollbar-themed">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            문서 목록 불러오는 중...
          </div>
        )}
        {error && (
          <p className="px-2 py-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {!loading && !error && tree && (tree.children?.length ?? 0) === 0 && (
          <p className="px-2 py-4 text-sm text-slate-500">열람 가능한 문서가 없습니다.</p>
        )}
        {!loading && !error && searchQuery.trim() && filteredTree === null && (
          <p className="px-2 py-4 text-sm text-slate-500">검색 결과가 없습니다.</p>
        )}
        {!loading && !error && filteredTree?.children?.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={0}
            expanded={effectiveExpanded}
            onToggle={onToggle}
            onPreviewDocument={onPreviewDocument}
            onAskDocument={onAskDocument}
          />
        ))}
      </div>

      <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
        <p>보기: 원문 미리보기 · 질문: 해당 문서로 AI 채팅</p>
        <p className="mt-1">권한 밖 문서는 표시되지 않습니다.</p>
      </div>
    </div>
  );
}

export function DocumentTree({
  userRole,
  onPreviewDocument,
  onAskDocument,
  mobileOpen = false,
  onMobileClose,
}: DocumentTreeProps) {
  const [tree, setTree] = useState<VaultTreeNode | null>(null);
  const [stats, setStats] = useState<TreeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/documents/tree")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "문서 목록을 불러오지 못했습니다.");
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setTree(data.tree);
        setStats(data.stats);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userRole]);

  const handlePreview = (doc: { title: string; fileName: string }) => {
    onPreviewDocument(doc);
    onMobileClose?.();
  };

  const handleAsk = (doc: { title: string; fileName: string }) => {
    onAskDocument(doc);
    onMobileClose?.();
  };

  useEffect(() => {
    if (!mobileOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onMobileClose?.();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 shrink-0 min-h-0 h-full">
        <TreePanel
          key={stats?.visibleCount ?? "loading"}
          tree={tree}
          stats={stats}
          loading={loading}
          error={error}
          onPreviewDocument={handlePreview}
          onAskDocument={handleAsk}
        />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 flex lg:hidden"
          onClick={onMobileClose}
          role="presentation"
        >
          <div
            className="w-[min(100%,20rem)] h-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="사내 문서 목록"
          >
            <TreePanel
              key={stats?.visibleCount ?? "loading"}
              tree={tree}
              stats={stats}
              loading={loading}
              error={error}
              onPreviewDocument={handlePreview}
              onAskDocument={handleAsk}
              onClose={onMobileClose}
              showClose
            />
          </div>
          <div className="flex-1 bg-black/40" aria-hidden="true" />
        </div>
      )}
    </>
  );
}
