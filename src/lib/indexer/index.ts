import fs from "fs";
import path from "path";
import { generateEmbedding } from "../embeddings";
import { getVectorStore } from "../vector-store";
import type { VectorDocument } from "../vector-store/types";
import { extractDocumentText, isSupportedExtension } from "../parsers";

const META_SUFFIX = ".meta.json";

interface FileMeta {
  role: string;
  title?: string;
  uploadedBy?: string;
  fileType?: string;
  expires?: string;
}

async function getVaultFiles(dir: string): Promise<string[]> {
  let results: string[] = [];
  const list = await fs.promises.readdir(dir);
  for (const file of list) {
    const filePath = path.resolve(dir, file);
    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory() && !file.startsWith(".")) {
      results = results.concat(await getVaultFiles(filePath));
    } else if (isSupportedExtension(path.extname(file).toLowerCase())) {
      results.push(filePath);
    }
  }
  return results;
}

export function parseContent(content: string): { role: string; title: string; text: string; expires?: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);
  let role = "general";
  let title = "";
  let text = content;
  let expires: string | undefined;

  if (match) {
    const fm = match[1];
    const roleMatch = fm.match(/role:\s*([a-zA-Z0-9_-]+)/i);
    const titleMatch = fm.match(/title:\s*(.+)/i);
    const expiresMatch = fm.match(/expires:\s*(\d{4}-\d{2}-\d{2})/i);
    if (roleMatch) role = roleMatch[1].toLowerCase();
    if (titleMatch) title = titleMatch[1].trim();
    if (expiresMatch) expires = expiresMatch[1];
    text = content.slice(match[0].length);
  }

  if (!title) {
    const h1 = text.match(/^#\s+(.+)/m);
    if (h1) title = h1[1].trim();
  }

  return { role, title, text, expires };
}

export function chunkText(text: string, maxChars: number = 1000): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // PDF/DOCX 등 헤더 없는 plain text: 길이 기반 분할
  if (!/^#+\s+/m.test(trimmed)) {
    const chunks: string[] = [];
    for (let i = 0; i < trimmed.length; i += maxChars) {
      chunks.push(trimmed.slice(i, i + maxChars));
    }
    return chunks;
  }

  const chunks: string[] = [];
  const lines = text.split("\n");
  let currentHeader = "";
  let currentChunk = "";

  for (const line of lines) {
    if (line.match(/^#+\s+/)) {
      if (currentChunk.trim().length > 0) {
        chunks.push(currentHeader ? `${currentHeader}\n${currentChunk.trim()}` : currentChunk.trim());
      }
      currentHeader = line.trim();
      currentChunk = "";
    } else {
      if (currentChunk.length + line.length > maxChars && currentChunk.length > 0) {
        chunks.push(currentHeader ? `${currentHeader}\n${currentChunk.trim()}` : currentChunk.trim());
        currentChunk = line + "\n";
      } else {
        currentChunk += line + "\n";
      }
    }
  }
  if (currentChunk.trim().length > 0) {
    chunks.push(currentHeader ? `${currentHeader}\n${currentChunk.trim()}` : currentChunk.trim());
  }

  return chunks;
}

async function readFileMeta(filePath: string): Promise<FileMeta | null> {
  const metaPath = filePath + META_SUFFIX;
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(await fs.promises.readFile(metaPath, "utf-8")) as FileMeta;
  } catch {
    return null;
  }
}

export async function writeFileMeta(filePath: string, meta: FileMeta): Promise<void> {
  await fs.promises.writeFile(filePath + META_SUFFIX, JSON.stringify(meta, null, 2), "utf-8");
}

async function processFile(
  file: string,
  vaultPath: string,
  overrideRole?: string
): Promise<VectorDocument[]> {
  const fileName = path.basename(file);
  const ext = path.extname(file).toLowerCase();
  const sidecar = await readFileMeta(file);

  let role = overrideRole ?? sidecar?.role ?? "general";
  let title = sidecar?.title ?? fileName;
  let expires: string | undefined = sidecar?.expires as string | undefined;
  let text = "";

  if (ext === ".md" || ext === ".markdown") {
    const rawContent = await fs.promises.readFile(file, "utf-8");
    const parsed = parseContent(rawContent);
    role = overrideRole ?? parsed.role;
    title = parsed.title || title;
    expires = parsed.expires;
    text = parsed.text;
  } else {
    const extracted = await extractDocumentText(file);
    title = extracted.title || title;
    text = extracted.text;
  }

  const chunks = chunkText(text);
  const vectorDocs: VectorDocument[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.length < 10) continue;

    const embedding = await generateEmbedding(chunk);
    vectorDocs.push({
      id: `${fileName}-chunk-${i}`,
      text: chunk,
      metadata: {
        source: file.replace(vaultPath, ""),
        fileName,
        role,
        title,
        fileType: ext.replace(".", ""),
        ...(expires ? { expires } : {}),
      },
      embedding,
    });
  }
  return vectorDocs;
}

/** 단일 파일 증분 인덱싱 */
export async function indexSingleFile(
  filePath: string,
  vaultPath: string,
  options?: { uploadedBy?: string; docRole?: string }
): Promise<{ chunks: number; fileName: string }> {
  const store = getVectorStore();
  const docs = await processFile(filePath, vaultPath, options?.docRole);
  const fileName = path.basename(filePath);

  await store.deleteByFileName(fileName);
  await store.addDocuments(docs);
  await store.upsertDocumentMeta({
    id: `doc-${fileName}`,
    fileName,
    source: filePath.replace(vaultPath, ""),
    role: (docs[0]?.metadata.role as string) || options?.docRole || "general",
    title: (docs[0]?.metadata.title as string) || fileName,
    uploadedBy: options?.uploadedBy,
  });

  return { chunks: docs.length, fileName };
}

/** Vault 전체 재인덱싱 */
export async function runIndexing(vaultPath: string) {
  console.log(`Starting indexing from vault: ${vaultPath}`);
  const files = await getVaultFiles(vaultPath);
  console.log(`Found ${files.length} documents.`);

  const vectorDocs: VectorDocument[] = [];
  for (const file of files) {
    try {
      const docs = await processFile(file, vaultPath);
      vectorDocs.push(...docs);
      console.log(`Indexed ${path.basename(file)}: ${docs.length} chunks`);
    } catch (error) {
      console.error(`Error processing file ${file}:`, error);
    }
  }

  const store = getVectorStore();
  await store.saveAll(vectorDocs);

  for (const file of files) {
    const fileName = path.basename(file);
    const fileDocs = vectorDocs.filter((d) => d.metadata.fileName === fileName);
    if (fileDocs.length > 0) {
      await store.upsertDocumentMeta({
        id: `doc-${fileName}`,
        fileName,
        source: file.replace(vaultPath, ""),
        role: (fileDocs[0].metadata.role as string) || "general",
        title: (fileDocs[0].metadata.title as string) || fileName,
      });
    }
  }

  console.log(`Indexing complete! Indexed ${vectorDocs.length} chunks.`);
  return { files: files.length, chunks: vectorDocs.length };
}
