import type { UserRole } from "@/lib/rbac";
import { canAccessDocument } from "@/lib/rbac";
import { isDocumentExpired } from "@/lib/audit/siem";
import { reciprocalRankFusion } from "./hybrid-core";
import { rerankCandidates } from "./reranker";
import { diversifyByFile } from "./file-diversity";
import { crossEncodeRerank } from "./cross-encoder";
import type { VectorDocument } from "@/lib/vector-store/types";

/** A/B eval — 메모리 코퍼스로 hybrid 검색 (임베딩 모델별 재인덱싱) */
export async function hybridSearchInMemory(
  corpus: VectorDocument[],
  query: string,
  queryEmbedding: number[],
  topK: number,
  userRole: UserRole
): Promise<VectorDocument[]> {
  const candidateLimit = Math.max(topK * 4, 20);

  const candidates = corpus
    .filter((doc) => canAccessDocument(userRole, (doc.metadata.role || "general") as UserRole))
    .filter((doc) => !isDocumentExpired(doc.metadata));

  if (candidates.length === 0) return [];

  const rrfScores = reciprocalRankFusion(candidates, query, queryEmbedding);
  const reranked = rerankCandidates(
    query,
    rrfScores.slice(0, candidateLimit).map((item) => ({
      document: item.document,
      rrfScore: item.score,
    })),
    candidateLimit
  );
  const crossReranked = await crossEncodeRerank(query, reranked);
  return diversifyByFile(crossReranked, topK).map((item) => item.document);
}
