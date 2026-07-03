import fs from "fs";
import path from "path";
import { getVaultPath } from "@/lib/config";
import { extractDocumentText } from "@/lib/parsers";
import type { UserRole } from "@/lib/rbac";
import { scanVaultDocuments } from "./scan";

export interface VaultDocumentContent {
  fileName: string;
  title: string;
  fileType: string;
  relativePath: string;
  content: string;
}

function isSafeFileName(fileName: string): boolean {
  return (
    fileName.length > 0 &&
    fileName.length <= 255 &&
    !fileName.includes("..") &&
    !fileName.includes("/") &&
    !fileName.includes("\\")
  );
}

function resolveVaultFilePath(vaultPath: string, relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\//, "");
  const fullPath = path.resolve(vaultPath, normalized);
  const vaultRoot = path.resolve(vaultPath);
  if (!fullPath.startsWith(vaultRoot + path.sep) && fullPath !== vaultRoot) {
    return null;
  }
  if (!fs.existsSync(fullPath)) return null;
  return fullPath;
}

export async function getVaultDocumentContent(
  fileName: string,
  userRole: UserRole
): Promise<VaultDocumentContent | null> {
  if (!isSafeFileName(fileName)) return null;

  const documents = await scanVaultDocuments({ userRole });
  const doc = documents.find((d) => d.fileName === fileName);
  if (!doc) return null;

  const vaultPath = getVaultPath();
  const fullPath = resolveVaultFilePath(vaultPath, doc.relativePath);
  if (!fullPath) return null;

  const extracted = await extractDocumentText(fullPath);
  return {
    fileName: doc.fileName,
    title: doc.title || extracted.title,
    fileType: doc.fileType,
    relativePath: doc.relativePath,
    content: extracted.text,
  };
}
