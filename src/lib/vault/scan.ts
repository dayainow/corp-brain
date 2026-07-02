import fs from "fs";
import path from "path";
import { getVaultPath } from "@/lib/config";
import { parseContent } from "@/lib/indexer";
import { isDocumentExpired } from "@/lib/audit/siem";
import { canAccessDocument, isValidUserRole, type UserRole } from "@/lib/rbac";
import { isSupportedExtension } from "@/lib/parsers";
import { shouldSkipVaultFile } from "./skip";
import type { VaultDocumentInfo } from "./types";

const META_SUFFIX = ".meta.json";

function normalizeRole(role: string): UserRole {
  return isValidUserRole(role) ? role : "general";
}

async function readDocumentMeta(
  fullPath: string,
  fileName: string
): Promise<Pick<VaultDocumentInfo, "role" | "title" | "expires">> {
  const ext = path.extname(fileName).toLowerCase();

  if (ext === ".md" || ext === ".markdown") {
    const content = await fs.promises.readFile(fullPath, "utf-8");
    const parsed = parseContent(content);
    return {
      role: normalizeRole(parsed.role),
      title: parsed.title || fileName,
      expires: parsed.expires,
    };
  }

  const metaPath = fullPath + META_SUFFIX;
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(await fs.promises.readFile(metaPath, "utf-8"));
      return {
        role: normalizeRole(meta.role ?? "general"),
        title: meta.title ?? fileName,
        expires: meta.expires,
      };
    } catch {
      /* ignore */
    }
  }

  return { role: "general", title: fileName };
}

async function scanDir(
  dir: string,
  vaultPath: string
): Promise<VaultDocumentInfo[]> {
  const results: VaultDocumentInfo[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      results.push(...(await scanDir(fullPath, vaultPath)));
      continue;
    }

    if (!isSupportedExtension(path.extname(entry.name).toLowerCase())) continue;
    if (shouldSkipVaultFile(entry.name)) continue;

    const stat = await fs.promises.stat(fullPath);
    const relativePath = fullPath.replace(vaultPath, "").replace(/\\/g, "/");
    const folderPath = path.dirname(relativePath).replace(/\\/g, "/") || "/";
    const meta = await readDocumentMeta(fullPath, entry.name);

    results.push({
      fileName: entry.name,
      relativePath,
      folderPath,
      role: meta.role,
      title: meta.title,
      fileType: path.extname(entry.name).toLowerCase().replace(".", ""),
      size: stat.size,
      expires: meta.expires,
    });
  }

  return results;
}

export interface ScanVaultOptions {
  vaultPath?: string;
  userRole?: UserRole;
  includeExpired?: boolean;
}

export async function scanVaultDocuments(
  options: ScanVaultOptions = {}
): Promise<VaultDocumentInfo[]> {
  const vaultPath = options.vaultPath ?? getVaultPath();
  const all = await scanDir(vaultPath, vaultPath);

  return all.filter((doc) => {
    if (!options.includeExpired && isDocumentExpired({ expires: doc.expires })) {
      return false;
    }
    if (options.userRole && !canAccessDocument(options.userRole, doc.role)) {
      return false;
    }
    return true;
  });
}
