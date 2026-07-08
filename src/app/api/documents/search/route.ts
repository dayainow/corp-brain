import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { searchVaultByKeyword } from "@/lib/search/keyword-vault";
import type { UserRole } from "@/lib/rbac";
import { logError } from "@/lib/logger";

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

export async function GET(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limitParam = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(1, Math.floor(limitParam)), MAX_LIMIT)
    : DEFAULT_LIMIT;

  if (!q) {
    return NextResponse.json({ error: "검색어(q)가 필요합니다." }, { status: 400 });
  }

  if (q.length > 200) {
    return NextResponse.json(
      { error: "검색어는 200자 이하로 입력해 주세요." },
      { status: 400 }
    );
  }

  const userRole = session!.user.role as UserRole;

  try {
    const results = await searchVaultByKeyword(q, userRole, limit);
    return NextResponse.json({
      query: q,
      count: results.length,
      results,
    });
  } catch (err) {
    logError("documents.search", { err, path: "/api/documents/search", query: q });
    return NextResponse.json({ error: "키워드 검색에 실패했습니다." }, { status: 500 });
  }
}
