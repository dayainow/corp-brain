import fs from "fs";
import path from "path";
import { config } from "@/lib/config";
import type { UserRole } from "@/lib/rbac";
import { canAccessDocument } from "@/lib/rbac";
import type { VectorStore } from "./interface";
import type { DocumentMeta, VectorDocument } from "./types";

const VECTOR_STORE_PATH = config.vectorStore.jsonPath;

export class JsonVectorStore implements VectorStore {
  private async load(): Promise<VectorDocument[]> {
    try {
      if (!fs.existsSync(VECTOR_STORE_PATH)) return [];
      const data = await fs.promises.readFile(VECTOR_STORE_PATH, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async persist(vectors: VectorDocument[]): Promise<void> {
    const dir = path.dirname(VECTOR_STORE_PATH);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(VECTOR_STORE_PATH, JSON.stringify(vectors, null, 2), "utf-8");
  }

  async saveAll(docs: VectorDocument[]): Promise<void> {
    await this.persist(docs);
  }

  async addDocuments(docs: VectorDocument[]): Promise<void> {
    const existing = await this.load();
    const newIds = new Set(docs.map((d) => d.id));
    const filtered = existing.filter((d) => !newIds.has(d.id));
    await this.persist([...filtered, ...docs]);
  }

  async deleteByFileName(fileName: string): Promise<void> {
    const existing = await this.load();
    await this.persist(existing.filter((d) => d.metadata.fileName !== fileName));
  }

  async getAccessibleDocuments(userRole: UserRole): Promise<VectorDocument[]> {
    const all = await this.load();
    return all.filter((doc) =>
      canAccessDocument(userRole, doc.metadata.role || "general")
    );
  }

  async count(): Promise<number> {
    return (await this.load()).length;
  }

  async upsertDocumentMeta(_meta: DocumentMeta): Promise<void> {
    // JSON store: metadata lives in chunk metadata only
  }
}
