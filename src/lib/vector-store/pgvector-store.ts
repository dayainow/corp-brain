import type { PoolClient } from "pg";
import { withClient } from "@/lib/db/client";
import type { UserRole } from "@/lib/rbac";
import { canAccessDocument } from "@/lib/rbac";
import type { VectorStore } from "./interface";
import type { DocumentMeta, VectorDocument } from "./types";

function toVectorString(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
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
    const rows = await withClient(async (client) => {
      const result = await client.query(
        `SELECT id, text, file_name, source, role, metadata, embedding::text
         FROM vector_chunks`
      );
      return result.rows;
    });

    return rows
      .filter((row) => canAccessDocument(userRole, row.role || "general"))
      .map((row) => ({
        id: row.id,
        text: row.text,
        metadata: {
          source: row.source,
          fileName: row.file_name,
          role: row.role,
          ...(typeof row.metadata === "object" ? row.metadata : {}),
        },
        embedding: parsePgVector(row.embedding),
      }));
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
