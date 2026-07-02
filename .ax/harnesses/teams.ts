/**
 * CorpBrain 품질 하네스 — 에이전트 팀 정의
 *
 * Glean(엔터프라이즈 검색)·Guru(지식 카드)·Notion AI(대화형 RAG) 패턴을
 * 참고한 역할 분담입니다.
 */

export type HarnessTeamId = "platform" | "search" | "security" | "rag" | "delivery";

export interface HarnessAgent {
  id: string;
  team: HarnessTeamId;
  name: string;
  focus: string;
  checks: string[];
}

export const HARNESS_TEAMS: Record<HarnessTeamId, { label: string; mission: string }> = {
  platform: {
    label: "플랫폼팀",
    mission: "Health·Vault·인프라 가용성 (Glean Connector 운영 패턴)",
  },
  search: {
    label: "검색품질팀",
    mission: "Hit@K·멀티턴 쿼리·랭킹 회귀 방지 (Glean Search Quality)",
  },
  security: {
    label: "보안팀",
    mission: "RBAC·Rate limit·감사 로그 (Guru 권한·컴플라이언스)",
  },
  rag: {
    label: "RAG팀",
    mission: "메시지 변환·임베딩·청킹 파이프라인 (Notion AI RAG)",
  },
  delivery: {
    label: "납품팀",
    mission: "E2E·빌드·문서 일관성",
  },
};

export const HARNESS_AGENTS: HarnessAgent[] = [
  {
    id: "platform-health",
    team: "platform",
    name: "헬스체크 에이전트",
    focus: "vault 경로·청크 수·Ollama 연결",
    checks: ["vaultExists", "chunkCountOrDegraded", "ollamaReachable"],
  },
  {
    id: "search-eval",
    team: "search",
    name: "검색 평가 에이전트",
    focus: "eval-queries Hit@3 게이트",
    checks: ["hitAt3Threshold", "queryContextFollowUp"],
  },
  {
    id: "security-rbac",
    team: "security",
    name: "RBAC 에이전트",
    focus: "Role 계층·문서 접근",
    checks: ["roleHierarchy", "uploadPermissions"],
  },
  {
    id: "rag-messages",
    team: "rag",
    name: "메시지 파이프라인 에이전트",
    focus: "UIMessage→ModelMessage 변환",
    checks: ["toModelMessages", "validateChatMessages"],
  },
  {
    id: "delivery-smoke",
    team: "delivery",
    name: "스모크 에이전트",
    focus: "핵심 설정·경로 일관성",
    checks: ["vaultPathDefault", "embeddingModelConfig"],
  },
];

export function getAgentsByTeam(team: HarnessTeamId): HarnessAgent[] {
  return HARNESS_AGENTS.filter((a) => a.team === team);
}
