import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/auth/guard";
import { canUploadDocuments } from "@/lib/rbac";
import { getVaultPath } from "@/lib/config";
import { indexSingleFile } from "@/lib/indexer";
import { writeAuditLog, getClientIp } from "@/lib/audit";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_EXTENSIONS = [".md", ".markdown"];

export async function POST(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  if (!canUploadDocuments(session!.user.role)) {
    return NextResponse.json(
      { error: "문서 업로드는 Manager 이상 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const docRole = (formData.get("role") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: "마크다운(.md) 파일만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 2MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    const vaultPath = getVaultPath();
    const uploadsDir = path.join(vaultPath, "uploads");
    if (!fs.existsSync(uploadsDir)) {
      await fs.promises.mkdir(uploadsDir, { recursive: true });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, "_");
    const timestamp = Date.now();
    const destPath = path.join(uploadsDir, `${timestamp}_${safeName}`);

    let content = await file.text();

    // Frontmatter에 role이 없으면 업로드 시 지정한 role 삽입
    if (!content.startsWith("---")) {
      content = `---\nrole: ${docRole}\n---\n\n${content}`;
    }

    await fs.promises.writeFile(destPath, content, "utf-8");

    const indexResult = await indexSingleFile(
      destPath,
      vaultPath,
      session!.user.email
    );

    await writeAuditLog({
      action: "document.upload",
      userId: session!.user.id,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      detail: { fileName: safeName, docRole, path: destPath, chunks: indexResult.chunks },
      ip: getClientIp(req),
    });

    return NextResponse.json({
      success: true,
      file: { name: safeName, path: destPath, role: docRole },
      index: indexResult,
      message: `업로드 및 인덱싱 완료 (${indexResult.chunks}개 청크)`,
    });
  } catch (err) {
    console.error("Upload failed:", err);
    return NextResponse.json({ error: "업로드에 실패했습니다." }, { status: 500 });
  }
}

export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const vaultPath = getVaultPath();
    const uploadsDir = path.join(vaultPath, "uploads");

    if (!fs.existsSync(uploadsDir)) {
      return NextResponse.json({ files: [] });
    }

    const files = await fs.promises.readdir(uploadsDir);
    const mdFiles = files.filter((f) => f.endsWith(".md"));

    return NextResponse.json({
      files: mdFiles.map((name) => ({
        name,
        uploadedAt: name.split("_")[0],
      })),
      canUpload: canUploadDocuments(session!.user.role),
    });
  } catch (err) {
    console.error("List uploads failed:", err);
    return NextResponse.json({ error: "목록 조회 실패" }, { status: 500 });
  }
}
