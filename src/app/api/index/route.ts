import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { canReindexVault } from "@/lib/rbac";
import { runIndexing, runIncrementalSync } from "@/lib/indexer";
import { getVaultPath } from "@/lib/config";
import { writeAuditLog, getClientIp } from "@/lib/audit";
import { checkRateLimit, denyRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

export async function POST(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  if (!canReindexVault(session!.user.role)) {
    return NextResponse.json(
      { error: "Vault 동기화는 Admin 권한이 필요합니다." },
      { status: 403 }
    );
  }

  const indexRate = await checkRateLimit(`index:${session!.user.id}`, {
    windowMs: 60 * 60 * 1000,
    maxRequests: 2,
  });
  if (!indexRate.allowed) {
    return denyRateLimit(indexRate.resetAt);
  }

  try {
    const vaultPath = getVaultPath();
    let body: { mode?: string } = {};
    try {
      body = await req.json();
    } catch {
      // empty body → full sync
    }
    const result =
      body.mode === "incremental"
        ? await runIncrementalSync(vaultPath)
        : await runIndexing(vaultPath);

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
    logError("index.api", { err: error, userId: session!.user.id, path: "/api/index" });
    return NextResponse.json({ error: "인덱싱에 실패했습니다." }, { status: 500 });
  }
}
