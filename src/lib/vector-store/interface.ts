import type { UserRole } from "@/lib/rbac";
import type { DocumentMeta, VectorDocument } from "./types";

export interface VectorStore {
  saveAll(docs: VectorDocument[]): Promise<void>;
  addDocuments(docs: VectorDocument[]): Promise<void>;
  deleteByFileName(fileName: string): Promise<void>;
  getAccessibleDocuments(userRole: UserRole): Promise<VectorDocument[]>;
  count(): Promise<number>;
  upsertDocumentMeta(meta: DocumentMeta): Promise<void>;
}
