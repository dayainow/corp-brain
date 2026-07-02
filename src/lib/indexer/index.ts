import fs from "fs";
import path from "path";
import { generateEmbedding } from "../embeddings";
import { getVectorStore } from "../vector-store";
import type { VectorDocument } from "../vector-store/types";

async function getMarkdownFiles(dir: string): Promise<string[]> {
  let results: string[] = [];
  const list = await fs.promises.readdir(dir);
  for (const file of list) {
    const filePath = path.resolve(dir, file);
    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory() && !file.startsWith(".")) {
      results = results.concat(await getMarkdownFiles(filePath));
    } else if (file.endsWith(".md")) {
      results.push(filePath);
    }
  }
  return results;
}

export function parseContent(content: string): { role: string; title: string; text: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);
  let role = "general";
  let title = "";
  let text = content;

  if (match) {
    const fm = match[1];
    const roleMatch = fm.match(/role:\s*([a-zA-Z0-9_-]+)/i);
    const titleMatch = fm.match(/title:\s*(.+)/i);
    if (roleMatch) role = roleMatch[1].toLowerCase();
    if (titleMatch) title = titleMatch[1].trim();
    text = content.slice(match[0].length);
  }

  if (!title) {
    const h1 = text.match(/^#\s+(.+)/m);
    if (h1) title = h1[1].trim();
  }

  return { role, title, text };
}

export function chunkText(text: string, maxChars: number = 1000): string[] {
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

async function processFile(
  file: string,
  vaultPath: string
): Promise<VectorDocument[]> {
  const rawContent = await fs.promises.readFile(file, "utf-8");
  const { role, title, text } = parseContent(rawContent);
  const chunks = chunkText(text);
  const vectorDocs: VectorDocument[] = [];
  const fileName = path.basename(file);

  for (let i = 0; i < chunks.length; i++) {
    const chunkText_ = chunks[i];
    if (chunkText_.length < 10) continue;

    const embedding = await generateEmbedding(chunkText_);
    vectorDocs.push({
      id: `${fileName}-chunk-${i}`,
      text: chunkText_,
      metadata: {
        source: file.replace(vaultPath, ""),
        fileName,
        role,
        title,
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
  uploadedBy?: string
): Promise<{ chunks: number; fileName: string }> {
  const store = getVectorStore();
  const docs = await processFile(filePath, vaultPath);
  const fileName = path.basename(filePath);

  await store.deleteByFileName(fileName);
  await store.addDocuments(docs);
  await store.upsertDocumentMeta({
    id: `doc-${fileName}`,
    fileName,
    source: filePath.replace(vaultPath, ""),
    role: (docs[0]?.metadata.role as string) || "general",
    title: (docs[0]?.metadata.title as string) || fileName,
    uploadedBy,
  });

  return { chunks: docs.length, fileName };
}

/** Vault 전체 재인덱싱 */
export async function runIndexing(vaultPath: string) {
  console.log(`Starting indexing from vault: ${vaultPath}`);
  const mdFiles = await getMarkdownFiles(vaultPath);
  console.log(`Found ${mdFiles.length} markdown files.`);

  const vectorDocs: VectorDocument[] = [];
  for (const file of mdFiles) {
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

  for (const file of mdFiles) {
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
  return { files: mdFiles.length, chunks: vectorDocs.length };
}
