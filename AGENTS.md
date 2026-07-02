<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CorpBrain Agent 팀 (Quality Harness)

Glean·Guru·Notion AI 패턴을 참고한 **5팀 하네스** 구성입니다.  
변경 후 `npm run harness:quality` 또는 `npm run quality:loop`로 검증하세요.

## 팀 구성

| 팀 | 미션 | 담당 영역 |
|----|------|-----------|
| **플랫폼** | Health·Vault·인프라 | `src/app/api/health`, `vault/`, Docker |
| **검색품질** | Hit@K·멀티턴 쿼리 | `src/lib/search/`, `data/eval-queries.json` |
| **보안** | RBAC·Rate limit·감사 | `src/lib/rbac.ts`, `src/lib/audit/` |
| **RAG** | 메시지·임베딩·청킹 | `src/app/api/chat/`, `src/lib/embeddings/` |
| **납품** | E2E·빌드·설정 일관성 | `e2e/`, `src/lib/config.ts` |

## 에이전트 역할

구현: `.ax/harnesses/teams.ts` · 실행: `.ax/harnesses/quality-suite-harness.ts`

1. **헬스체크 에이전트** (플랫폼) — vault 존재, 인덱스 상태
2. **검색 평가 에이전트** (검색품질) — eval Hit@3, 후속 질문 쿼리
3. **RBAC 에이전트** (보안) — Role 계층·업로드·Sync Vault 권한
4. **메시지 파이프라인 에이전트** (RAG) — UIMessage 변환
5. **스모크 에이전트** (납품) — vault 경로·임베딩 모델 설정

## 품질 루프

```bash
npm run quality:loop   # lint → unit → harness → build → e2e
npm run harness:quality
npm run index:vault    # vault 인덱싱 후 eval:search
```

## 작업 시 규칙

- RAG 변경 시 **검색품질팀**: `eval:search` Hit@3 확인
- 인증·권한 변경 시 **보안팀**: `rbac.test.ts` + harness
- API·메시지 변경 시 **RAG팀**: `messages.test.ts` + harness
- 배포 전 **플랫폼팀**: `/api/health` degraded 없음, Sync Vault 완료
