"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Loader2, X } from "lucide-react";
import type { UserRole } from "@/lib/rbac";

interface DocumentUploadProps {
  userRole: UserRole;
  onUploadComplete?: () => void;
}

export function DocumentUpload({ userRole, onUploadComplete }: DocumentUploadProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [docRole, setDocRole] = useState<UserRole>("general");
  const fileRef = useRef<HTMLInputElement>(null);

  const canUpload = userRole === "manager" || userRole === "admin";

  if (!canUpload) return null;

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("role", docRole);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setMessage(`✓ ${data.file.name} 업로드 완료`);
        if (fileRef.current) fileRef.current.value = "";
        onUploadComplete?.();
      } else {
        setMessage(`✗ ${data.error}`);
      }
    } catch {
      setMessage("✗ 네트워크 오류");
    } finally {
      setUploading(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-sm transition-colors"
        title="문서 업로드"
      >
        <Upload className="w-4 h-4" />
        Upload
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                문서 업로드
              </h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  마크다운 파일 (.md, 최대 2MB)
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".md,.markdown"
                  required
                  className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900 dark:file:text-blue-300"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
                  문서 열람 권한
                </label>
                <select
                  value={docRole}
                  onChange={(e) => setDocRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                >
                  <option value="general">일반 (General)</option>
                  <option value="manager">팀장 (Manager)</option>
                  {userRole === "admin" && <option value="admin">관리자 (Admin)</option>}
                </select>
              </div>

              {message && (
                <p className={`text-sm ${message.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "업로드 중..." : "업로드"}
              </button>
            </form>

            <p className="mt-3 text-xs text-slate-400">
              업로드 후 Admin이 Sync Vault를 실행하면 검색에 반영됩니다.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
