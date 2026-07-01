import fs from "fs";
import path from "path";
import { generateEmbedding } from "../embeddings";
import { VectorDocument, saveVectors } from "../vector-store";

// Recursive function to get all markdown files
async function getMarkdownFiles(dir: string): Promise<string[]> {
  let results: string[] = [];
  try {
    const list = await fs.promises.readdir(dir);
    for (const file of list) {
      const filePath = path.resolve(dir, file);
      const stat = await fs.promises.stat(filePath);
      if (stat && stat.isDirectory()) {
        // Exclude hidden directories like .obsidian or .git
        if (!file.startsWith(".")) {
          results = results.concat(await getMarkdownFiles(filePath));
        }
      } else if (file.endsWith(".md")) {
        results.push(filePath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  return results;
}

// Parses frontmatter to extract metadata (like role)
function parseContent(content: string): { role: string; text: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);
  let role = 'general';
  let text = content;

  if (match) {
    const frontmatter = match[1];
    const roleMatch = frontmatter.match(/role:\s*([a-zA-Z0-9_-]+)/i);
    if (roleMatch) {
      role = roleMatch[1].toLowerCase();
    }
    text = content.slice(match[0].length);
  }
  return { role, text };
}

// Semantic chunking based on markdown headings
function chunkText(text: string, maxChars: number = 1000): string[] {
  const chunks: string[] = [];
  const lines = text.split('\n');
  let currentHeader = '';
  let currentChunk = '';

  for (const line of lines) {
    if (line.match(/^#+\s+/)) {
      if (currentChunk.trim().length > 0) {
        chunks.push(currentHeader ? `${currentHeader}\n${currentChunk.trim()}` : currentChunk.trim());
      }
      currentHeader = line.trim();
      currentChunk = '';
    } else {
      if ((currentChunk.length + line.length) > maxChars && currentChunk.length > 0) {
        chunks.push(currentHeader ? `${currentHeader}\n${currentChunk.trim()}` : currentChunk.trim());
        currentChunk = line + '\n';
      } else {
        currentChunk += line + '\n';
      }
    }
  }
  if (currentChunk.trim().length > 0) {
    chunks.push(currentHeader ? `${currentHeader}\n${currentChunk.trim()}` : currentChunk.trim());
  }
  return chunks;
}

export async function runIndexing(vaultPath: string) {
  console.log(`Starting indexing from vault: ${vaultPath}`);
  const mdFiles = await getMarkdownFiles(vaultPath);
  console.log(`Found ${mdFiles.length} markdown files.`);

  const vectorDocs: VectorDocument[] = [];
  let chunkCount = 0;

  for (const file of mdFiles) {
    try {
      const rawContent = await fs.promises.readFile(file, "utf-8");
      
      const { role, text: cleanText } = parseContent(rawContent);
      const chunks = chunkText(cleanText);
      
      for (let i = 0; i < chunks.length; i++) {
        const text = chunks[i];
        if (text.length < 10) continue; // Skip too small chunks

        console.log(`Generating embedding for chunk ${chunkCount + 1}...`);
        const embedding = await generateEmbedding(text);
        
        vectorDocs.push({
          id: `${path.basename(file)}-chunk-${i}`,
          text,
          metadata: {
            source: file.replace(vaultPath, ""), // Relative path from vault
            fileName: path.basename(file),
            role: role // Save role for RBAC
          },
          embedding
        });
        chunkCount++;
      }
    } catch (error) {
      console.error(`Error processing file ${file}:`, error);
    }
  }

  await saveVectors(vectorDocs);
  console.log(`Indexing complete! Indexed ${vectorDocs.length} chunks.`);
  return { files: mdFiles.length, chunks: vectorDocs.length };
}
