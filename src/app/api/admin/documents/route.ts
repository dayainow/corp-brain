import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/auth/guard";
import { getVaultPath } from "@/lib/config";
import { getVectorStore } from "@/lib/vector-store";
import { parseContent } from "@/lib/indexer";
import { isSupportedExtension } from "@/lib/parsers";

export async function GET() {
  const { error } = await requireAuth("admin");
  if (error) return error;

  const vaultPath = getVaultPath();
  const store = getVectorStore();
  const chunkCount = await store.count();

  async function scanDir(dir: string): Promise<Array<{
    fileName: string;
    path: string;
    role: string;
    title: string;
    size: number;
    fileType: string;
  }>> {
    const results: Array<{
      fileName: string;
      path: string;
      role: string;
      title: string;
      size: number;
      fileType: string;
    }> = [];

    if (!fs.existsSync(dir)) return results;

    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        results.push(...(await scanDir(fullPath)));
      } else if (isSupportedExtension(path.extname(entry.name).toLowerCase())) {
        const stat = await fs.promises.stat(fullPath);
        const ext = path.extname(entry.name).toLowerCase();
        let role = "general";
        let title = entry.name;

        if (ext === ".md" || ext === ".markdown") {
          const content = await fs.promises.readFile(fullPath, "utf-8");
          const parsed = parseContent(content);
          role = parsed.role;
          title = parsed.title || entry.name;
        } else {
          const metaPath = fullPath + ".meta.json";
          if (fs.existsSync(metaPath)) {
            try {
              const meta = JSON.parse(await fs.promises.readFile(metaPath, "utf-8"));
              role = meta.role ?? role;
              title = meta.title ?? title;
            } catch {
              /* ignore */
            }
          }
        }

        results.push({
          fileName: entry.name,
          path: fullPath.replace(vaultPath, ""),
          role,
          title,
          size: stat.size,
          fileType: ext.replace(".", ""),
        });
      }
    }
    return results;
  }

  const documents = await scanDir(vaultPath);

  return NextResponse.json({
    documents,
    stats: {
      totalDocuments: documents.length,
      totalChunks: chunkCount,
      byRole: {
        general: documents.filter((d) => d.role === "general").length,
        manager: documents.filter((d) => d.role === "manager").length,
        admin: documents.filter((d) => d.role === "admin").length,
      },
      byType: {
        md: documents.filter((d) => d.fileType === "md" || d.fileType === "markdown").length,
        pdf: documents.filter((d) => d.fileType === "pdf").length,
        docx: documents.filter((d) => d.fileType === "docx").length,
      },
    },
  });
}
