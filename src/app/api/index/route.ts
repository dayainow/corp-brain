import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { canReindexVault } from "@/lib/rbac";
import { runIndexing } from "@/lib/indexer";
import { getVaultPath } from "@/lib/config";
import { writeAuditLog, getClientIp } from "@/lib/audit";

export async function POST(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  if (!canReindexVault(session!.user.role)) {
    return NextResponse.json(
      { error: "Vault 동기화는 Admin 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    const vaultPath = getVaultPath();
    const result = await runIndexing(vaultPath);

    await writeAuditLog({
      action: "index.sync",
      userId: session!.user.id,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      detail: result,
      ip: getClientIp(req),
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Indexing failed:", error);
    return NextResponse.json({ error: "인덱싱에 실패했습니다." }, { status: 500 });
  }
}
