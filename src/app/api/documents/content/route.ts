import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import type { UserRole } from "@/lib/rbac";
import { getVaultDocumentContent } from "@/lib/vault/get-document";
import { logError } from "@/lib/logger";

export async function GET(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const fileName = new URL(req.url).searchParams.get("fileName")?.trim();
  if (!fileName) {
    return NextResponse.json({ error: "fileName이 필요합니다." }, { status: 400 });
  }

  try {
    const doc = await getVaultDocumentContent(
      fileName,
      session!.user.role as UserRole
    );
    if (!doc) {
      return NextResponse.json(
        { error: "문서를 찾을 수 없거나 열람 권한이 없습니다." },
        { status: 404 }
      );
    }
    return NextResponse.json(doc);
  } catch (err) {
    logError("documents.content", { err, fileName });
    return NextResponse.json(
      { error: "문서 내용을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
