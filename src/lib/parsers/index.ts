import fs from "fs";
import path from "path";

export const SUPPORTED_EXTENSIONS = [".md", ".markdown", ".pdf", ".docx"] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export function isSupportedExtension(ext: string): ext is SupportedExtension {
  return SUPPORTED_EXTENSIONS.includes(ext as SupportedExtension);
}

export function getFileType(ext: string): "markdown" | "pdf" | "docx" | "unknown" {
  if (ext === ".md" || ext === ".markdown") return "markdown";
  if (ext === ".pdf") return "pdf";
  if (ext === ".docx") return "docx";
  return "unknown";
}

/** PDF에서 텍스트 추출 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

/** DOCX에서 텍스트 추출 (mammoth) */
async function extractDocxText(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export interface ExtractedDocument {
  text: string;
  title: string;
  fileType: "markdown" | "pdf" | "docx";
}

/**
 * 파일 경로에서 텍스트 추출
 * - .md: frontmatter 제외 본문
 * - .pdf / .docx: 파서로 텍스트 추출
 */
export async function extractDocumentText(filePath: string): Promise<ExtractedDocument> {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);
  const titleFromName = fileName.replace(/\.[^.]+$/, "");

  if (ext === ".md" || ext === ".markdown") {
    const content = await fs.promises.readFile(filePath, "utf-8");
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontmatterRegex);
    let text = content;
    let title = titleFromName;

    if (match) {
      const fm = match[1];
      const titleMatch = fm.match(/title:\s*(.+)/i);
      if (titleMatch) title = titleMatch[1].trim();
      text = content.slice(match[0].length);
    } else {
      const h1 = text.match(/^#\s+(.+)/m);
      if (h1) title = h1[1].trim();
    }

    return { text, title, fileType: "markdown" };
  }

  const buffer = await fs.promises.readFile(filePath);

  if (ext === ".pdf") {
    const text = await extractPdfText(buffer);
    return { text: normalizeText(text), title: titleFromName, fileType: "pdf" };
  }

  if (ext === ".docx") {
    const text = await extractDocxText(buffer);
    return { text: normalizeText(text), title: titleFromName, fileType: "docx" };
  }

  throw new Error(`지원하지 않는 파일 형식: ${ext}`);
}

/** 연속 공백·빈 줄 정리 */
function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}
