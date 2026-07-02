import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/auth/guard";
import { getVaultPath } from "@/lib/config";
import { getVectorStore } from "@/lib/vector-store";
import { parseContent } from "@/lib/indexer";

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
  }>> {
    const results: Array<{
      fileName: string;
      path: string;
      role: string;
      title: string;
      size: number;
    }> = [];

    if (!fs.existsSync(dir)) return results;

    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        results.push(...(await scanDir(fullPath)));
      } else if (entry.name.endsWith(".md")) {
        const content = await fs.promises.readFile(fullPath, "utf-8");
        const { role, title } = parseContent(content);
        const stat = await fs.promises.stat(fullPath);
        results.push({
          fileName: entry.name,
          path: fullPath.replace(vaultPath, ""),
          role,
          title: title || entry.name,
          size: stat.size,
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
    },
  });
}
