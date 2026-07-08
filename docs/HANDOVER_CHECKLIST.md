# CorpBrain 인수인계 체크리스트

> **대상**: NovaPay IT · DevOps · RAG · L1 · 서비스 오너  
> **작성일**: 2026-07-08  
> **상태**: PoC/파일럿 **기술 납품 완료** — 운영 오픈은 고객사 인수 후 진행  
> **관련**: [PILOT_TECH_READY.md](./PILOT_TECH_READY.md) · [PILOT_DECLARATION.md](./PILOT_DECLARATION.md) · [RUNBOOK.md](./RUNBOOK.md) · [DEPLOY.md](./DEPLOY.md)

---

## 1. 납품물 요약

| 구분 | 내용 | 위치 |
|------|------|------|
| **소스** | Next.js 16 RAG 앱 + API + 테스트 | `src/` |
| **문서 Vault** | PoC 사내 문서 22종 | `vault/` |
| **납품 문서** | 설계·API·환경 11종 | `docs/deliverables/` |
| **운영** | Runbook · 배포 · 파일럿 가이드 | `docs/RUNBOOK.md`, `DEPLOY.md` |
| **품질** | Harness · E2E · `pilot:ready` | `npm run pilot:ready` |
| **최근 기능** | 메인 **AI 질문 / 본문 키워드 검색** | `GET /api/documents/search` |

**완성도 (기술 납품)**: 약 **90~95%** — 코드·문서·자동 게이트 완료.  
**미완 (운영 인수)**: 사내 HTTPS 배포 · 파일럿 오픈 선언 · 실계정/SSO 전환.

---

## 2. 인수자 30분 온보딩

### 2.1 클론·실행

```bash
git clone https://github.com/dayainow/corp-brain.git && cd corp-brain
cp .env.example .env.local
# AUTH_SECRET=$(openssl rand -base64 32)  → .env.local

npm install
ollama run llama3          # 별도 터미널
npm run dev                # http://localhost:3000
```

Admin 로그인 → **Sync Vault** 1회 (또는 `npm run index:vault`).

**시드 계정 (PoC, 운영 전 교체 필수)**

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| admin | lee.minho@novapay.kr | novapay2026 |
| manager | (팀장 시드) | novapay2026 |
| general | kim.junho@novapay.kr | novapay2026 |

### 2.2 UI 확인 (3분)

| # | 확인 | 기대 |
|---|------|------|
| 1 | 사이드바 **이름 검색** | `연차` → 트리 필터 |
| 2 | 메인 **본문 검색** 모드 | `휴가` → 스니펫 결과 |
| 3 | 메인 **AI 질문** | 답변 + `[출처: …]` |
| 4 | 사이드바 **질문** 버튼 | `「{제목}」 문서의 주요 내용을 알려줘` 자동 전송 |
| 5 | general 로그인 | admin 전용 문서 트리 미노출 |

### 2.3 자동 검증 (10분)

```bash
# 개발 스택
npm run quality:gate          # index + harness (Hit@3 ≥ 80%)

# 운영 스택 (Docker + Ollama 필요)
npm run smoke:compose         # Compose :3100 + PgVector
npm run pilot:ready           # 파일럿 전체 게이트 (권장)

# 빠른 재확인
npm run pilot:closeout-loop -- --quick
```

---

## 3. 역할별 인수 항목

### DevOps / 인프라

| # | 항목 | 확인 | 참고 |
|---|------|:----:|------|
| D1 | Docker Desktop 또는 Colima | ☐ | Compose 스모크용 |
| D2 | `./scripts/deploy-compose.sh` → **:3100** | ☐ | [DEPLOY.md](./DEPLOY.md) |
| D3 | 운영 **HTTPS 도메인** + 리버스 프록시 | ☐ | 예: `https://corpbrain.novapay.kr` |
| D4 | `AUTH_SECRET` **운영 전용** 재발급 | ☐ | dev와 다른 값 |
| D5 | PgVector·Redis 백업·볼륨 정책 | ☐ | `docker compose down -v` 주의 |
| D6 | Ollama GPU 서버 분리 검토 | ☐ | 호스트 `host.docker.internal:11434` |

### IT / 계정

| # | 항목 | 확인 | 참고 |
|---|------|:----:|------|
| I1 | PoC 시드 비밀번호 **전원 교체** | ☐ | `novapay2026` 폐기 |
| I2 | Google SSO (`GOOGLE_CLIENT_*`) | ☐ | `@novapay.kr` |
| I3 | 파일럿 50명 계정·역할 | ☐ | `pilot:bday -- --step b1` |
| I4 | `SLACK_USER_MAP` (Slack User ID → 이메일) | ☐ | RBAC 매핑 |

### RAG / 플랫폼

| # | 항목 | 확인 | 참고 |
|---|------|:----:|------|
| R1 | `vault/` 실제 사내 문서 반영 | ☐ | frontmatter `role` |
| R2 | Sync Vault (전체/증분) | ☐ | 문서 변경 시 필수 |
| R3 | Hit@3 재측정 (`npm run eval:search`) | ☐ | 목표 ≥ 80% |
| R4 | 실패 질문 수집 → eval·동의어 보완 | ☐ | D+7 루틴 |

### L1 / 운영

| # | 항목 | 확인 | 참고 |
|---|------|:----:|------|
| L1 | `/api/health` 일일 점검 | ☐ | [RUNBOOK §2](./RUNBOOK.md) |
| L2 | `health:watch` 또는 알림 웹훅 | ☐ | `#corpbrain-alerts` |
| L3 | 온콜·에스컬레이션 공유 | ☐ | [RUNBOOK §7](./RUNBOOK.md) |
| L4 | 장애 Runbook §4 숙지 | ☐ | Ollama·빈 인덱스·PgVector |

### Slack (선택)

| # | 항목 | 확인 | 참고 |
|---|------|:----:|------|
| S1 | Slash `/corpbrain` Request URL | ☐ | `https://<도메인>/api/slack/command` |
| S2 | `SLACK_SIGNING_SECRET` 일치 | ☐ | `.env.local` ↔ Slack App |
| S3 | `npm run pilot:slack-smoke` | ☐ | 로컬은 `BASE_URL` 필요 |

> **주의**: `localhost`는 Slack이 접근 불가. 사내 운영은 **공개 HTTPS** 또는 ngrok(데모만).

---

## 4. 포트·환경 정리

| 용도 | 포트 | 명령 |
|------|------|------|
| 개발 | **3000** | `npm run dev` |
| Compose 운영 스모크 | **3100** | `deploy-compose.sh` |
| E2E | **3001** | `npm run test:e2e` |
| Ollama | **11434** | `ollama run llama3` |
| Compose Postgres | **5433** | 호스트 바인딩 |

| 변수 | 필수 | 비고 |
|------|------|------|
| `AUTH_SECRET` | O | 32자+ |
| `VAULT_PATH` | | `./vault` |
| `VECTOR_STORE` | | dev: `json` / Compose: `pgvector` |
| `SLACK_SIGNING_SECRET` | 선택 | Slack 연동 시 |

전체: [`.env.example`](../.env.example) · [README §환경 변수](../README.md)

---

## 5. 범위 밖 (향후 Phase 5)

- Microsoft Teams 봇
- K8s·멀티 테넌트·2FA TOTP
- Notion / Confluence / Drive 커넥터
- ngrok 기반 Slack은 **데모용** — 운영은 사내 HTTPS 필수

---

## 6. 문서 맵 (읽는 순서)

1. **인수인계** — **이 문서**
2. **실행** — [README §실행 방법](../README.md) · [08_개발환경구성서](./deliverables/08_개발환경구성서.md)
3. **배포** — [DEPLOY.md](./DEPLOY.md)
4. **운영** — [RUNBOOK.md](./RUNBOOK.md)
5. **파일럿 오픈** — [PILOT_DECLARATION.md](./PILOT_DECLARATION.md) → [PILOT_CHECKLIST.md](./PILOT_CHECKLIST.md)
6. **설계·API** — [deliverables/](./deliverables/README.md)

---

## 7. 인수 확인 (서명)

| 역할 | 확인 내용 | 이름 | 일자 |
|------|-----------|------|------|
| **납품 (개발)** | 소스·문서·게이트 스크립트 인도 | | |
| **DevOps** | Compose·HTTPS·env·백업 경로 이해 | | |
| **IT** | 계정·SSO·Slack 설정 계획 | | |
| **RAG/L1** | Sync·health·Runbook 숙지 | | |
| **서비스 오너** | 파일럿 오픈 일정·Go/No-Go | | |

---

## 8. 마무리 명령 (납품자 최종 1회)

```bash
git pull origin main
npm install
npm run pilot:closeout-loop -- --quick   # 또는 pilot:ready
```

**기대**: FAIL=0 · `main` 최신 (`feat: 본문 키워드 검색` 포함)

---

*문서 버전 v1.0 · 2026-07-08 · CorpBrain PoC/파일럿 기술 납품 마무리*
