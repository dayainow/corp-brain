import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { scanVaultDocuments } from "@/lib/vault/scan";
import { buildVaultTree } from "@/lib/vault/tree";
import type { UserRole } from "@/lib/rbac";
import { logError } from "@/lib/logger";

export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  const userRole = session!.user.role as UserRole;

  try {
    const documents = await scanVaultDocuments({ userRole });
    const tree = buildVaultTree(documents);

    return NextResponse.json({
      tree,
      stats: {
        visibleCount: documents.length,
        byRole: {
          general: documents.filter((d) => d.role === "general").length,
          manager: documents.filter((d) => d.role === "manager").length,
          admin: documents.filter((d) => d.role === "admin").length,
        },
      },
    });
  } catch (err) {
    logError("documents.tree", { err, path: "/api/documents/tree" });
    return NextResponse.json({ error: "문서 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}
