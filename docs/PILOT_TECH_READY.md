# CorpBrain 파일럿 기술 준비 완료 보고

> **상태**: ✅ 기술 준비 완료 (오픈 선언은 [PILOT_DECLARATION.md](./PILOT_DECLARATION.md) 참고)  
> **검증일**: 2026-07-07  
> **버전**: v1.0

---

## 1. 자동 게이트 결과

| 게이트 | 명령 | 결과 |
|--------|------|------|
| 전체 준비 | `npm run pilot:ready` | **PASS** (FAIL=0, WARN=1*) |
| Hit@3 | harness + eval:search | **100%** (25문항) |
| Compose | smoke:compose | **PASS** (pgvector, chunkCount=96) |
| E2E A8 | pilot.spec + auth | **9/9** |
| E2E A9 | rag-ollama | **4/4** |
| A10 웹훅 | pilot:a10-setup | **PASS** (#corpbrain-alerts) |
| B4 Slack | pilot:slack-smoke | **PASS** 3/3 |
| B3 watch | health:watch | **기동** (`data/health-watch.pid`) |

\* WARN: 호스트 `ollama` preflight — Compose health 내 ollama check는 ok

---

## 2. 기술 준비 체크리스트 (자동 완료)

| # | 항목 | 상태 |
|---|------|:----:|
| A1 | AUTH_SECRET | ✅ |
| A2 | Ollama llama3 | ✅ (Compose 경로) |
| A3 | Compose 배포 | ✅ :3100 |
| A4 | pgvector + Redis | ✅ |
| A5 | Sync Vault | ✅ 96 chunks |
| A6 | /api/health ok | ✅ |
| A6b | pilot:preflight / pilot:ready | ✅ |
| A7 | Hit@3 ≥ 80% | ✅ 100% |
| A7b | smoke:compose | ✅ |
| A8 | E2E RBAC | ✅ |
| A9 | RAG E2E + 출처 | ✅ |
| A10 | alerts 웹훅 | ✅ |

---

## 3. 수동 잔여 (오픈 선언)

→ **[PILOT_DECLARATION.md](./PILOT_DECLARATION.md)** §2~3

| # | 항목 | 담당 |
|---|------|------|
| B1 | 파일럿 계정 배포 | IT |
| B2 | `#corpbrain-pilot` 공지 | PM |
| B5 | 에스컬레이션 고정 공지 | 서비스 오너 |
| A10b | 온콜 연락망 공유 | 플랫폼 |
| D | Go/No-Go 서명 | 서비스 오너·L1·RAG |

---

## 4. 마무리 검증 (3회 루프)

```bash
npm run pilot:closeout-loop          # health + harness + A10 + Slack + vitest × 3
npm run pilot:closeout-loop -- --quick   # E2E/vitest 생략, 빠른 확인
```

**2026-07-07 실행**: `--quick` 3회 루프 **PASS=12 FAIL=0**

---

## 5. 운영 포트·경로

| 용도 | URL |
|------|-----|
| Compose 운영 | http://localhost:3100 |
| health | `/api/health` |
| 가이드 | `/guide` |
| Admin | `/admin` (admin) |

---

*다음 단계: [PILOT_DECLARATION.md](./PILOT_DECLARATION.md)로 오픈 선언*
