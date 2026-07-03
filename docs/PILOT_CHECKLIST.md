# CorpBrain 파일럿 체크리스트 (1페이지)

> **대상**: NovaPay 파일럿 오픈 (50명)  
> **작성일**: 2026-07-03  
> **상세 운영**: [RUNBOOK.md](./RUNBOOK.md) · **배포**: [DEPLOY.md](./DEPLOY.md) · **오픈 가이드**: [PILOT_OPEN.md](./PILOT_OPEN.md)

---

## A. 오픈 전 (D-1)

| # | 항목 | 확인 | 담당 |
|---|------|:----:|------|
| A1 | `AUTH_SECRET` 32자+ 발급·보관 | ☐ | DevOps |
| A2 | Ollama `llama3` 설치·기동 (`ollama run llama3`) | ☐ | 플랫폼 |
| A3 | Compose 배포 (`./scripts/deploy-compose.sh`) | ☐ | DevOps |
| A4 | `VECTOR_STORE=pgvector`, `REDIS_URL` 설정 | ☐ | DevOps |
| A5 | **Sync Vault** 1회 (admin UI 또는 `npm run index:vault`) | ☐ | RAG |
| A6 | `/api/health` → `status: ok`, `chunkCount > 0` | ☐ | L1 |
| A6b | `npm run pilot:preflight` PASS | ☐ | L1 |
| A7 | `npm run harness:quality` 또는 `npm run quality:gate` — Hit@3 ≥ 80% | ☐ | RAG |
| A7b | `npm run smoke:compose` PASS (선택·권장) | ☐ | DevOps |
| A8 | 시드 계정·RBAC 3종 — `npm run test:e2e` (pilot.spec, auth) | ☐ | QA |
| A9 | 샘플 질문·출처 뱃지 — `e2e/citation-preview.spec.ts` 또는 `npm run test:e2e:rag` (Ollama 기동 시) | ☐ | QA |
| A10 | `#corpbrain-alerts` 웹훅·온콜 — `npm run pilot:a10-smoke` | ☐ | 플랫폼 |

---

## B. 오픈 당일 (D-Day)

| # | 항목 | 확인 | 담당 |
|---|------|:----:|------|
| B1 | 파일럿 대상자 계정·역할 배포 — `npm run pilot:bday -- --step b1` | ☐ | IT |
| B2 | `/guide` 인앱 가이드·예시 질문 — `pilot:bday -- --step b2` Slack 복사 | ☐ | PM |
| B3 | health 모니터링 — `npm run pilot:bday -- --step b3` · `--watch` | ☐ | L1 |
| B4 | Slack `/corpbrain` — `npm run pilot:env-bday` 후 `pilot:slack-smoke` | ☐ | 플랫폼 |
| B5 | 장애 시 Runbook §4·§7 에스컬레이션 경로 공지 | ☐ | 서비스 오너 |

**시드 계정 (PoC, 파일럿 후 변경)**

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| admin | lee.minho@novapay.kr | novapay2026 |
| manager | (팀장 시드) | novapay2026 |
| general | kim.junho@novapay.kr | novapay2026 |

---

## C. 오픈 후 1주 (D+1 ~ D+7)

| # | 항목 | 확인 | 담당 |
|---|------|:----:|------|
| C1 | 일일 health 점검 ([RUNBOOK §2](./RUNBOOK.md)) | ☐ | L1 |
| C2 | 👍/👎 피드백 — `npm run report:feedback` · 주간 `npm run report:pilot-weekly` | ☐ | RAG |
| C3 | vault 문서 변경 시 Sync Vault 반영 | ☐ | admin |
| C4 | 실패 질문 5건 수집 → eval 문항·동의어 보완 검토 | ☐ | RAG |
| C5 | Hit@3 재측정 (문서·설정 변경 시) | ☐ | RAG |
| C6 | 파일럿 종료 회고 — `data/reports/pilot-weekly-*.md` + [PILOT_QUALITY_REPORT](./PILOT_QUALITY_REPORT.md) | ☐ | PM |

---

## D. Go / No-Go (최종)

| 조건 | 기준 |
|------|------|
| **Go** | health `ok` · Hit@3 ≥ 80% · 핵심 시나리오 3건 통과 · 온콜 가동 |
| **No-Go** | `unhealthy` 미해결 · 인덱스 비어 있음 · Ollama 미연결 · 보안 이슈 |

**서명 (예시)**

| 역할 | 이름 | 일자 |
|------|------|------|
| 서비스 오너 | | |
| 플랫폼 L1 | | |
| RAG 담당 | | |

---

*문서 버전 v0.1 · 상세 장애 대응은 [RUNBOOK.md](./RUNBOOK.md)를 따릅니다.*
