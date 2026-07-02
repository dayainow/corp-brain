import type { UserRole } from "@/lib/rbac";
import type { VectorDocument } from "./types";

export interface SearchCandidateOptions {
  query: string;
  queryEmbedding: number[];
  userRole: UserRole;
  /** RRF 전 후보 수 */
  limit: number;
}

export interface VectorStore {
  saveAll(docs: VectorDocument[]): Promise<void>;
  addDocuments(docs: VectorDocument[]): Promise<void>;
  deleteByFileName(fileName: string): Promise<void>;
  getAccessibleDocuments(userRole: UserRole): Promise<VectorDocument[]>;
  /** PgVector: ANN+키워드 DB 검색 / JSON: 전체 로드 */
  fetchSearchCandidates(options: SearchCandidateOptions): Promise<VectorDocument[]>;
  count(): Promise<number>;
  upsertDocumentMeta(meta: import("./types").DocumentMeta): Promise<void>;
}
