import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { getVectorStore } from "@/lib/vector-store";
import { scanVaultDocuments } from "@/lib/vault/scan";

export async function GET() {
  const { error } = await requireAuth("admin");
  if (error) return error;

  const store = getVectorStore();
  const chunkCount = await store.count();
  const documents = await scanVaultDocuments({ includeExpired: true });

  return NextResponse.json({
    documents: documents.map((d) => ({
      fileName: d.fileName,
      path: d.relativePath,
      role: d.role,
      title: d.title,
      size: d.size,
      fileType: d.fileType,
    })),
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
