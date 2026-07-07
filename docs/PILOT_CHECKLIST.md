# CorpBrain 파일럿 체크리스트 (1페이지)

> **대상**: NovaPay 파일럿 오픈 (50명)  
> **작성일**: 2026-07-03 · **갱신**: 2026-07-07  
> **기술 준비**: ✅ [PILOT_TECH_READY.md](./PILOT_TECH_READY.md)  
> **오픈 선언**: [PILOT_DECLARATION.md](./PILOT_DECLARATION.md)  
> **상세 운영**: [RUNBOOK.md](./RUNBOOK.md) · **배포**: [DEPLOY.md](./DEPLOY.md) · **B-Day**: [PILOT_OPEN.md](./PILOT_OPEN.md)

---

## 기술 준비 (자동 — 2026-07-07 완료)

`npm run pilot:ready` PASS · Hit@3 100% · A10 웹훅 · B4 Slack · health:watch 기동

```bash
npm run pilot:closeout-loop -- --quick   # 3회 재검증
```

---

## A. 오픈 전 (D-1)

| # | 항목 | 확인 | 담당 |
|---|------|:----:|------|
| A1 | `AUTH_SECRET` 32자+ 발급·보관 | ✅ | DevOps |
| A2 | Ollama `llama3` 설치·기동 | ✅ | 플랫폼 |
| A3 | Compose 배포 (`./scripts/deploy-compose.sh`) | ✅ | DevOps |
| A4 | `VECTOR_STORE=pgvector`, `REDIS_URL` 설정 | ✅ | DevOps |
| A5 | **Sync Vault** 1회 | ✅ | RAG |
| A6 | `/api/health` → `status: ok`, `chunkCount > 0` | ✅ | L1 |
| A6b | `npm run pilot:preflight` / `pilot:ready` PASS | ✅ | L1 |
| A7 | Hit@3 ≥ 80% (`harness:quality`) | ✅ | RAG |
| A7b | `npm run smoke:compose` PASS | ✅ | DevOps |
| A8 | E2E pilot + auth | ✅ | QA |
| A9 | RAG E2E (`test:e2e:rag`) | ✅ | QA |
| A10 | `#corpbrain-alerts` 웹훅 (`pilot:a10-setup`) | ✅ | 플랫폼 |
| A10b | 온콜 연락망 공유 (RUNBOOK §7) | ☐ | 플랫폼 |

---

## B. 오픈 당일 (D-Day)

| # | 항목 | 확인 | 담당 |
|---|------|:----:|------|
| B1 | 파일럿 대상자 계정·역할 배포 — `pilot:bday -- --step b1` | ☐ | IT |
| B2 | `#corpbrain-pilot` 공지 — `pilot:bday -- --step b2` | ☐ | PM |
| B3 | health 모니터링 — `pilot:bday -- --watch` | ✅ | L1 |
| B4 | Slack `/corpbrain` — `pilot:slack-smoke` | ✅ | 플랫폼 |
| B5 | 장애 시 Runbook §4·§7 에스컬레이션 경로 공지 | ☐ | 서비스 오너 |

**시드 계정 (PoC, 파일럿 후 변경)**

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| admin | lee.minho@novapay.kr | novapay2026 |
| manager | (팀장 시드) | novapay2026 |
| general | kim.junho@novapay.kr | novapay2026 |

→ **오픈 선언 순서**: [PILOT_DECLARATION.md](./PILOT_DECLARATION.md)

---

## C. 오픈 후 1주 (D+1 ~ D+7)

| # | 항목 | 확인 | 담당 |
|---|------|:----:|------|
| C1 | 일일 health 점검 ([RUNBOOK §2](./RUNBOOK.md)) | ☐ | L1 |
| C2 | 👍/👎 피드백 — `report:feedback` · `report:pilot-weekly` | ☐ | RAG |
| C3 | vault 문서 변경 시 Sync Vault 반영 | ☐ | admin |
| C4 | 실패 질문 5건 수집 → eval·동의어 보완 | ☐ | RAG |
| C5 | Hit@3 재측정 (문서·설정 변경 시) | ☐ | RAG |
| C6 | 파일럿 종료 회고 | ☐ | PM |

---

## D. Go / No-Go (최종)

| 조건 | 기준 |
|------|------|
| **Go** | health `ok` · Hit@3 ≥ 80% · 핵심 시나리오 3건 통과 · 온콜 가동 |
| **No-Go** | `unhealthy` 미해결 · 인덱스 비어 있음 · Ollama 미연결 · 보안 이슈 |

**서명** — [PILOT_DECLARATION.md §3 Step 5](./PILOT_DECLARATION.md)

| 역할 | 이름 | 일자 |
|------|------|------|
| 서비스 오너 | | |
| 플랫폼 L1 | | |
| RAG 담당 | | |

---

*문서 버전 v0.2 · 기술 준비 완료 · 오픈 선언은 PILOT_DECLARATION.md*
