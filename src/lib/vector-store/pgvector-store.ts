import type { PoolClient } from "pg";
import { withClient } from "@/lib/db/client";
import type { UserRole } from "@/lib/rbac";
import { getAccessibleRoles } from "@/lib/rbac";
import { expandKoreanTokens } from "@/lib/search/korean-query";
import type { VectorStore, SearchCandidateOptions } from "./interface";
import type { DocumentMeta, VectorDocument } from "./types";

function toVectorString(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function rowToDocument(row: {
  id: string;
  text: string;
  file_name: string;
  source: string;
  role: string;
  metadata: unknown;
  embedding: string;
}): VectorDocument {
  return {
    id: row.id,
    text: row.text,
    metadata: {
      source: row.source,
      fileName: row.file_name,
      role: row.role,
      ...(typeof row.metadata === "object" && row.metadata !== null ? row.metadata : {}),
    },
    embedding: parsePgVector(row.embedding),
  };
}

export class PgVectorStore implements VectorStore {
  async saveAll(docs: VectorDocument[]): Promise<void> {
    await withClient(async (client) => {
      await client.query("BEGIN");
      try {
        await client.query("DELETE FROM vector_chunks");
        await client.query("DELETE FROM documents");
        for (const doc of docs) {
          await this.insertChunk(client, doc);
        }
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    });
  }

  async addDocuments(docs: VectorDocument[]): Promise<void> {
    if (docs.length === 0) return;
    const fileName = docs[0].metadata.fileName;
    await this.deleteByFileName(fileName);
    await withClient(async (client) => {
      for (const doc of docs) {
        await this.insertChunk(client, doc);
      }
    });
  }

  async deleteByFileName(fileName: string): Promise<void> {
    await withClient(async (client) => {
      await client.query("DELETE FROM vector_chunks WHERE file_name = $1", [fileName]);
      await client.query("DELETE FROM documents WHERE file_name = $1", [fileName]);
    });
  }

  async getAccessibleDocuments(userRole: UserRole): Promise<VectorDocument[]> {
    const roles = getAccessibleRoles(userRole);
    const rows = await withClient(async (client) => {
      const result = await client.query(
        `SELECT id, text, file_name, source, role, metadata, embedding::text
         FROM vector_chunks
         WHERE role = ANY($1::text[])`,
        [roles]
      );
      return result.rows;
    });

    return rows.map(rowToDocument);
  }

  async fetchSearchCandidates(options: SearchCandidateOptions): Promise<VectorDocument[]> {
    const roles = getAccessibleRoles(options.userRole);
    const limit = options.limit;
    const vectorStr = toVectorString(options.queryEmbedding);
    const tokens = expandKoreanTokens(options.query).filter((t) => t.length > 1).slice(0, 8);

    const rows = await withClient(async (client) => {
      const vectorResult = await client.query(
        `SELECT id, text, file_name, source, role, metadata, embedding::text
         FROM vector_chunks
         WHERE role = ANY($1::text[])
         ORDER BY embedding <=> $2::vector
         LIMIT $3`,
        [roles, vectorStr, limit]
      );

      let keywordRows: typeof vectorResult.rows = [];
      if (tokens.length > 0) {
        const patterns = tokens.map((t) => `%${t}%`);
        const keywordResult = await client.query(
          `SELECT id, text, file_name, source, role, metadata, embedding::text
           FROM vector_chunks
           WHERE role = ANY($1::text[])
             AND text ILIKE ANY($2::text[])
           LIMIT $3`,
          [roles, patterns, limit]
        );
        keywordRows = keywordResult.rows;
      }

      const merged = new Map<string, VectorDocument>();
      for (const row of [...vectorResult.rows, ...keywordRows]) {
        merged.set(row.id, rowToDocument(row));
      }
      return [...merged.values()];
    });

    return rows;
  }

  async count(): Promise<number> {
    const result = await withClient((client) =>
      client.query("SELECT COUNT(*)::int AS count FROM vector_chunks")
    );
    return result.rows[0].count;
  }

  async upsertDocumentMeta(meta: DocumentMeta): Promise<void> {
    await withClient((client) =>
      client.query(
        `INSERT INTO documents (id, file_name, source, role, title, author, uploaded_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (file_name) DO UPDATE SET
           role = EXCLUDED.role,
           title = EXCLUDED.title,
           author = EXCLUDED.author,
           uploaded_by = EXCLUDED.uploaded_by,
           updated_at = NOW()`,
        [
          meta.id,
          meta.fileName,
          meta.source,
          meta.role,
          meta.title ?? null,
          meta.author ?? null,
          meta.uploadedBy ?? null,
        ]
      )
    );
  }

  private async insertChunk(client: PoolClient, doc: VectorDocument): Promise<void> {
    const docId = `doc-${doc.metadata.fileName}`;
    await client.query(
      `INSERT INTO documents (id, file_name, source, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (file_name) DO UPDATE SET role = EXCLUDED.role, updated_at = NOW()`,
      [docId, doc.metadata.fileName, doc.metadata.source, doc.metadata.role || "general"]
    );

    const chunkIndex = parseInt(doc.id.split("-chunk-").pop() ?? "0", 10);
    await client.query(
      `INSERT INTO vector_chunks (id, document_id, file_name, source, role, text, embedding, chunk_index, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         text = EXCLUDED.text,
         embedding = EXCLUDED.embedding,
         role = EXCLUDED.role,
         metadata = EXCLUDED.metadata`,
      [
        doc.id,
        docId,
        doc.metadata.fileName,
        doc.metadata.source,
        doc.metadata.role || "general",
        doc.text,
        toVectorString(doc.embedding),
        chunkIndex,
        JSON.stringify(doc.metadata),
      ]
    );
  }
}

function parsePgVector(raw: string): number[] {
  return raw
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map(Number);
}
