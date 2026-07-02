import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/auth/guard";
import { canUploadDocuments, canAssignDocumentRole, isValidUserRole } from "@/lib/rbac";
import { getVaultPath } from "@/lib/config";
import { indexSingleFile, writeFileMeta } from "@/lib/indexer";
import { writeAuditLog, getClientIp } from "@/lib/audit";
import { isSupportedExtension, getFileType } from "@/lib/parsers";
import { checkRateLimit, denyRateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";
import type { UserRole } from "@/lib/rbac";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (PDF/DOCX 대응)

export async function POST(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;

  if (!canUploadDocuments(session!.user.role)) {
    return NextResponse.json(
      { error: "문서 업로드는 Manager 이상 권한이 필요합니다." },
      { status: 403 }
    );
  }

  const uploadRate = await checkRateLimit(`upload:${session!.user.id}`, {
    windowMs: 60_000,
    maxRequests: 10,
  });
  if (!uploadRate.allowed) {
    return denyRateLimit(uploadRate.resetAt);
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const requestedRole = (formData.get("role") as string) || "general";
    const docRole: UserRole = isValidUserRole(requestedRole) ? requestedRole : "general";

    if (!canAssignDocumentRole(session!.user.role, docRole)) {
      return NextResponse.json(
        { error: "지정한 문서 권한을 부여할 수 없습니다." },
        { status: 403 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!isSupportedExtension(ext)) {
      return NextResponse.json(
        { error: "지원 형식: .md, .pdf, .docx" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 5MB 이하여야 합니다." },
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

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.promises.writeFile(destPath, buffer);

    const fileType = getFileType(ext);

    if (fileType === "markdown") {
      let content = buffer.toString("utf-8");
      if (!content.startsWith("---")) {
        content = `---\nrole: ${docRole}\n---\n\n${content}`;
        await fs.promises.writeFile(destPath, content, "utf-8");
      }
    } else {
      await writeFileMeta(destPath, {
        role: docRole,
        title: safeName.replace(/\.[^.]+$/, ""),
        uploadedBy: session!.user.email,
        fileType,
      });
    }

    const indexResult = await indexSingleFile(destPath, vaultPath, {
      uploadedBy: session!.user.email,
      docRole,
    });

    await writeAuditLog({
      action: "document.upload",
      userId: session!.user.id,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      detail: {
        fileName: safeName,
        docRole,
        fileType,
        path: destPath,
        chunks: indexResult.chunks,
      },
      ip: getClientIp(req),
    });

    return NextResponse.json({
      success: true,
      file: { name: safeName, path: destPath, role: docRole, fileType },
      index: indexResult,
      message: `업로드 및 인덱싱 완료 (${indexResult.chunks}개 청크)`,
    });
  } catch (err) {
    logError("upload.api", { err, userId: session!.user.id, path: "/api/upload" });
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
    const docFiles = files.filter((f) =>
      isSupportedExtension(path.extname(f).toLowerCase())
    );

    return NextResponse.json({
      files: docFiles.map((name) => ({
        name,
        fileType: getFileType(path.extname(name).toLowerCase()),
        uploadedAt: name.split("_")[0],
      })),
      canUpload: canUploadDocuments(session!.user.role),
    });
  } catch (err) {
    console.error("List uploads failed:", err);
    return NextResponse.json({ error: "목록 조회 실패" }, { status: 500 });
  }
}
