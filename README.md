# CorpBrain

**NovaPay(노바페이)** 사내 지식 베이스를 위한 엔터프라이즈급 **로컬 RAG 챗봇**입니다.  
사내 문서를 Ollama로 로컬 처리하며, RBAC·NextAuth·Slack 연동까지 지원합니다.

> 타깃: 주식회사 노바페이 — B2B 결제·정산 FinTech (320명)  
> 상세 계획·설계 다이어gram: [`docs/UPGRADE_PLAN.md`](docs/UPGRADE_PLAN.md)  
> **납품 산출물 (11종)**: [`docs/deliverables/README.md`](docs/deliverables/README.md)  
> **운영 Runbook**: [`docs/RUNBOOK.md`](docs/RUNBOOK.md)  
> **파일럿 체크리스트**: [`docs/PILOT_CHECKLIST.md`](docs/PILOT_CHECKLIST.md)  
> **기술 준비 완료**: [`docs/PILOT_TECH_READY.md`](docs/PILOT_TECH_READY.md)  
> **오픈 선언 가이드**: [`docs/PILOT_DECLARATION.md`](docs/PILOT_DECLARATION.md)  
> **파일럿 오픈 가이드**: [`docs/PILOT_OPEN.md`](docs/PILOT_OPEN.md)  
> **파일럿 품질 리포트**: [`docs/PILOT_QUALITY_REPORT.md`](docs/PILOT_QUALITY_REPORT.md)

---

## 한눈에 보기

| 항목 | 내용 |
|------|------|
| **목적** | 사내 마크다운·PDF·DOCX 문서를 검색해 권한에 맞게 AI 답변 |
| **LLM** | Ollama `llama3` (로컬, API 키 불필요) |
| **임베딩** | `Xenova/multilingual-e5-small` (Transformers.js, 로컬) |
| **벡터 DB** | `vectors.json` (개발) / PostgreSQL + PgVector (운영) |
| **인증** | NextAuth v5 — Credentials + Google SSO |
| **문서 Vault** | `vault/` 사내 문서 22종 (부서·권한별) |

---

## 납품 산출물

NovaPay 납품용 설계·명세 문서 11종입니다. 전체 목록과 다운로드 인덱스는 [`docs/deliverables/README.md`](docs/deliverables/README.md)를 참고하세요.

| No | 문서 | 링크 |
|----|------|------|
| 01 | 화면 목록 정의서 | [`01_화면목록정의서.md`](docs/deliverables/01_화면목록정의서.md) |
| 02 | 기능 요구사항 정의서 | [`02_기능요구사항정의서.md`](docs/deliverables/02_기능요구사항정의서.md) |
| 03 | 시스템 아키텍처 설계서 | [`03_시스템아키텍처설계서.md`](docs/deliverables/03_시스템아키텍처설계서.md) |
| 04 | 화면 흐름도 | [`04_화면흐름도.md`](docs/deliverables/04_화면흐름도.md) |
| 05 | 화면 설계서 | [`05_화면설계서.md`](docs/deliverables/05_화면설계서.md) |
| 06 | API 연동 명세서 | [`06_API연동명세서.md`](docs/deliverables/06_API연동명세서.md) |
| 07 | 컴포넌트 설계서 | [`07_컴포넌트설계서.md`](docs/deliverables/07_컴포넌트설계서.md) |
| 08 | 개발 환경 구성서 | [`08_개발환경구성서.md`](docs/deliverables/08_개발환경구성서.md) |
| 09 | 코딩 컨벤션 정의서 | [`09_코딩컨벤션정의서.md`](docs/deliverables/09_코딩컨벤션정의서.md) |
| 10 | 기능 구현 명세서 | [`10_기능구현명세서.md`](docs/deliverables/10_기능구현명세서.md) |
| 11 | 성능 분석 보고서 | [`11_성능분석보고서.md`](docs/deliverables/11_성능분석보고서.md) |

---

## 주요 기능

| 영역 | 기능 |
|------|------|
| **검색** | Vector + Keyword Hybrid → RRF → 한국어 리랭킹 → (옵션) Cross-encoder → Top-5 |
| **탐색** | 권한별 **사내 문서 트리** (이름 검색) + 메인 **AI 질문 / 본문 키워드 검색** 모드 전환 |
| **청킹** | MD: 헤더 기반 Semantic / PDF·DOCX: 1000자 단위 분할 |
| **권한** | Frontmatter `role` + NextAuth 세션, 검색·트리 Pre-filtering |
| **인증** | bcrypt 시드 계정 5종 + Google Workspace (`@novapay.kr`) |
| **문서** | `.md` `.pdf` `.docx` 업로드 (5MB), 증분 인덱싱 (mtime/hash) |
| **만료** | `expires: YYYY-MM-DD` — 만료 문서 검색·인용·트리 제외 |
| **UI** | RAG 단계 표시·참고 문서 카드, 출처 뱃지(**원문 모달·청크 하이라이트**), **후속 질문 칩**, 👍/👎 피드백, 모바일 safe-area |
| **Admin** | 감사 로그, 문서·청크 통계, Hit@3/MRR 메트릭 |
| **보안** | Middleware, Rate limit, 감사 로그, SIEM Webhook |
| **연동** | Slack `/corpbrain` (Role 매핑), Docker, Quality Harness CI |

---

## 스크린샷

> Docker Compose (`http://localhost:3100`) + Ollama 로컬 실행 기준 캡처 (2026-07-07)

| 로그인 | 채팅 · 문서 트리 |
|:---:|:---:|
| ![로그인](docs/screenshots/01-login.png) | ![채팅 홈](docs/screenshots/02-chat-home.png) |

| RAG 답변 · 출처 · 후속 질문 | Admin 대시보드 |
|:---:|:---:|
| ![RAG 답변](docs/screenshots/03-rag-answer.png) | ![Admin](docs/screenshots/04-admin.png) |

시드 계정: `lee.minho@novapay.kr` / `novapay2026` (admin)

---

## 시스템 아키텍처

브라우저·Slack 요청 → NextAuth 인증 → API → RAG 검색 → Ollama 스트리밍. 벡터는 JSON 또는 PgVector.

```mermaid
flowchart LR
    subgraph Client["클라이언트"]
        Web["Browser"]
        Slack["Slack"]
    end

    subgraph App["Next.js 16"]
        Auth["NextAuth"]
        API["API Routes"]
    end

    subgraph RAG["RAG"]
        Idx["Indexer"]
        VS["Vector Store"]
        LLM["Ollama"]
    end

    subgraph Data["데이터"]
        Vault[("Vault")]
        PG[("PgVector")]
    end

    Web & Slack --> Auth --> API
    API --> Idx --> VS
    VS --> Vault & PG
    API --> VS --> LLM
    API --> Audit["audit.log"]
```

| 레이어 | 기술 |
|--------|------|
| Frontend | React 19, TailwindCSS 4, react-markdown, remark-gfm |
| Auth | NextAuth v5, Middleware, bcryptjs |
| AI | Vercel AI SDK v6, `@ai-sdk/react`, Ollama OpenAI 호환 API |
| Embedding | `@xenova/transformers` |
| Parsing | pdf-parse v2, mammoth |
| Storage | JsonVectorStore / PgVectorStore (interface 추상화) |
| Ops | audit.log, SIEM, Playwright, Vitest, Docker |

---

## RAG 검색 파이프라인

```mermaid
flowchart TD
    Q["질문"] --> Embed["임베딩"]
    Embed --> Filter["RBAC + 만료 필터"]
    Filter --> RRF["Vector + Keyword → RRF"]
    RRF --> Rerank["Re-ranking Top-5"]
    Rerank --> LLM["Ollama 스트리밍"]
    LLM --> UI["Markdown + 출처 뱃지"]
```

1. **멀티턴 쿼리** — `buildSearchQuery`로 이전 대화 맥락 반영
2. **후보 수집** — Cosine ANN(PgVector) + ILIKE 키워드 → RRF
3. **Re-ranking** — 파일명·제목·한국어 동의어 가산 (`reranker.ts`, `korean-query.ts`)
4. **(옵션) Cross-encoder** — 질문·문서 쌍 재점수로 상위 후보 재정렬 (`cross-encoder.ts`)
5. **생성** — Top-5를 System Prompt에 주입, `[출처: filename.md]` 인용·**한국어 답변** 강제
6. **품질 측정** — `data/eval-queries.json` 25문항, `npm run eval:search` 또는 Admin `/api/admin/metrics`

---

## 웹 UI

### 채팅 (`/`)

레이아웃: **왼쪽 문서 트리** + **가운데 채팅** (데스크톱). 모바일은 헤더 **「문서」** 버튼으로 트리 드로어 + 하단 입력창 **safe-area** 고정.

- NextAuth 세션 기반 — Role은 **로그인 계정에서 자동** (UI 드롭다운 없음)
- **사내 문서 트리** — `vault/` 폴더 구조, RBAC, **제목·파일명 검색** (`GET /api/documents/tree`)
- 문서 행 **보기** → 원문 미리보기 모달 · **질문** → 해당 문서로 채팅 전송
- Vercel AI SDK v6 `DefaultChatTransport` 스트리밍
- 스트리밍 중 **RAG 단계 표시** (`검색 중…` → `답변 생성 중…`) + **참고 문서 카드** (`data-rag-sources`)
- Assistant 응답: **react-markdown + GFM** (표·코드블록 지원)
- `[출처: ...]` 패턴 → 클릭 가능한 **출처 뱃지** → **원문 모달** (RAG 청크 **하이라이트**, `GET /api/documents/content`)
- 답변 완료 후 **후속 질문 칩** 2~3개 (`이어서 물어보기`)
- **👍/👎 피드백** → `POST /api/chat/feedback` (감사 로그)
- `localStorage`에 대화 저장·복원, Clear 버튼으로 초기화
- **온보딩 배너**·**도움말 패널**·**빠른 질문** 프롬프트
- **Manager+**: Upload 모달 (`.md` `.pdf` `.docx`, role 지정)
- **Admin**: Sync Vault(전체/증분), Admin 대시보드 링크

### 사용 가이드 (`/guide`)

Role별 인앱 매뉴얼·FAQ·빠른 시작 질문 목록.

### 로그인 (`/login`)

- Credentials: `@novapay.kr` 시드 계정
- Google Workspace SSO (`.env`에 `GOOGLE_CLIENT_ID` 설정 시 버튼 표시)
- 시드 계정 원클릭 입력 UI

### Admin 대시보드 (`/admin`)

Admin 전용. 다음을 한 화면에서 조회합니다.

| 패널 | 내용 |
|------|------|
| **통계 카드** | 문서 수, 청크 수, Admin 문서 수, 감사 로그 건수 |
| **검색 품질** | Hit@1, Hit@3 (목표 80%), MRR |
| **감사 로그** | chat.query, document.upload, index.sync 등 최근 50건 |
| **문서 목록** | 파일명, title, role, md/pdf/docx 타입별 badge |

---

## 인증 & RBAC

- **Middleware** (`src/middleware.ts`): `/login`·`/api/auth`·`/api/health`·`/api/slack` 제외 전 경로 보호
- **API Guard** (`requireAuth(minimumRole?)`): chat, upload, index, admin API
- **Google SSO**: `hd=novapay.kr`, 도메인 외 계정 거부, `role-mapping.ts`로 Role 결정
- **부서 키워드 매핑** (SSO 신규 사용자): 법무/컴플라이언스 → admin, 재무/인사 → manager, 그 외 → general

| Role | 열람 문서 | 업로드 | Sync Vault | Admin |
|------|-----------|--------|------------|-------|
| `general` | general | — | — | — |
| `manager` | general + manager | O | — | — |
| `admin` | 전체 | O | O | O |

### 초기 배포 계정 (비밀번호 공통: `novapay2026`)

| 이름 | 이메일 | 부서 | Role |
|------|--------|------|------|
| 김준호 | kim.junho@novapay.kr | 엔지니어링 | general |
| 정해인 | jung.haein@novapay.kr | 고객지원 | general |
| 박수연 | park.suyeon@novapay.kr | 재무회계 | manager |
| 최유나 | choi.yuna@novapay.kr | 인사 | manager |
| 이민호 | lee.minho@novapay.kr | 법무·컴플라이언스 | admin |

---

## 문서 & 인덱싱

### 지원 형식

| 형식 | 파서 | 청킹 | 메타데이터 |
|------|------|------|------------|
| `.md` | frontmatter 파싱 | `#` 헤더 Semantic | YAML frontmatter |
| `.pdf` | pdf-parse v2 | 1000자 분할 | `.meta.json` sidecar |
| `.docx` | mammoth | 1000자 분할 | `.meta.json` sidecar |

```yaml
---
role: manager
title: Q2 실적 보고서
expires: 2027-06-30
---
```

### 인덱싱 모드

| 모드 | 트리거 | 권한 | 동작 |
|------|--------|------|------|
| **전체** | Sync Vault / `npm run index:vault` | admin | Vault 재귀 스캔 → `saveAll()` |
| **증분** | `POST /api/index` `{"mode":"incremental"}` / CLI `--incremental` | admin | manifest(mtime·hash) 기준 변경 파일만 |
| **업로드** | Upload UI | manager+ | `indexSingleFile()` — 해당 파일만 교체 |

### 벡터 스토어 (추상화)

`VectorStore` interface → 구현체 교체 가능 (`VECTOR_STORE` env).

| | JsonVectorStore | PgVectorStore |
|---|-----------------|---------------|
| **용도** | 로컬 개발 | Docker / 운영 |
| **경로** | `src/data/vectors.json` (런타임 생성, Git 미포함) | PostgreSQL + pgvector |
| **마이그레이션** | — | `npm run db:migrate` |
| **스키마** | — | `npm run db:init` |

PgVector 테이블: `documents`(메타), `vector_chunks`(384d embedding, IVFFlat index).

### 문서 Vault (`vault/`)

NovaPay 사내 지식 베이스 문서 저장소 (부서·권한별 폴더 구조, 22종):

```
vault/
├── 전사공통/   인사·규정·엔지니어링·양식 (general)
├── 재무회계/   보고서·인보이스·양식 (manager)
├── 운영/       장애·회의록 (manager)
├── 법무/       nda·계약 (admin)
└── uploads/    웹 업로드 저장소
```

| 폴더 | 예시 문서 | Role |
|------|-----------|------|
| `전사공통/인사/` | `연차휴가규정.md`, `온보딩안내.md` | general |
| `전사공통/규정/` | `재택근무정책.md`, `출장경비정책.md` | general |
| `재무회계/보고서/` | `2026-q2-마케팅실적.md` | manager |
| `재무회계/인보이스/` | `aws-2026-q2.md` | manager |
| `법무/nda/` | `표준nda.md`, `파트너사nda.md` | admin |

상세 구조: [`vault/README.md`](vault/README.md)

---

## API 레퍼런스

| Method | Path | 권한 | 설명 |
|--------|------|------|------|
| `POST` | `/api/chat` | 로그인 | RAG 스트리밍, Rate limit 20/min |
| `POST` | `/api/chat/feedback` | 로그인 | 답변 👍/👎 피드백 |
| `GET` | `/api/documents/tree` | 로그인 | RBAC 필터링된 vault 문서 트리 |
| `GET` | `/api/documents/search` | 로그인 | 본문 키워드 검색 (`?q=&limit=`, RBAC, AI 없음) |
| `GET` | `/api/documents/content` | 로그인 | 출처 원문 (RBAC) |
| `POST` | `/api/upload` | manager+ | multipart 업로드 + 증분 인덱싱 |
| `POST` | `/api/index` | admin | Vault 전체/증분 재인덱싱 (`mode`) |
| `GET` | `/api/health` | 공개 | status, chunkCount, vector store |
| `POST` | `/api/slack/command` | Slack HMAC | Slash Command |
| `GET` | `/api/admin/audit` | admin | `?limit=100` 감사 로그 |
| `GET` | `/api/admin/documents` | admin | 문서 목록 + byRole/byType 통계 |
| `GET` | `/api/admin/metrics` | admin | Hit@K, MRR 평가 결과 |

---

## 보안 & 감사

### 감사 로그 (`data/audit.log`)

JSON Lines 형식. 기록 이벤트:

| action | 발생 시점 |
|--------|-----------|
| `chat.query` | 채팅 질의 (질문 일부, sources, IP) |
| `chat.feedback` | 답변 👍/👎 피드백 |
| `document.upload` | 파일 업로드 |
| `index.sync` | Sync Vault (전체/증분) |
| `auth.login` / `auth.logout` | 로그인·로그아웃 |

`AUDIT_WEBHOOK_URL` 설정 시 Datadog/Splunk 등 SIEM으로 **실시간 전송** (`exportToSiem`).

### Rate Limiting

| API | 한도 |
|-----|------|
| `/api/chat` | 20 req/min/사용자 |
| `/api/upload` | 10 req/min/사용자 |
| `/api/index` | 2 req/hour/사용자 |
| `/api/slack/command` | 30 req/min/Slack user |

초과 시 `429` + `Retry-After` 헤더 (Redis 우선, 미설정 시 인메모리 fallback / `src/lib/rate-limit/`)

---

## Slack 연동

Slack App에서 Slash Command `/corpbrain` → Request URL: `https://your-domain/api/slack/command`

```bash
# .env.local
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_USER_MAP={"U01234":"lee.minho@novapay.kr"}
```

동작: Slack 서명 검증 → `SLACK_USER_MAP`으로 Role 결정 → RAG 검색 → 요약 반환 → audit.log 기록.

### 문서 검색 (UI)

| 위치 | 모드 | 설명 |
|------|------|------|
| **사이드바** | 이름 검색 | 제목·파일명 필터 (클라이언트) |
| **메인** | AI 질문 | RAG 채팅 (Ollama) |
| **메인** | 본문 검색 | 인덱스 청크 키워드 검색 (`GET /api/documents/search`) |

사이드바 **질문** 버튼 기본 프롬프트: `「{문서 제목}」 문서의 주요 내용을 알려줘`

---

## npm 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` / `start` | 프로덕션 빌드·실행 |
| `npm test` | Vitest 단위 테스트 (79개) |
| `npm run test:watch` | Vitest watch 모드 |
| `npm run test:e2e` | Playwright E2E (32건, RAG 4건은 Ollama·인덱스 없으면 skip) |
| `npm run test:e2e:rag` | Ollama RAG E2E만 (`ollama run llama3` + `index:vault` 선행) |
| `npm run test:e2e:ui` | Playwright UI 모드 |
| `npm run pilot:preflight` | 파일럿 D-1 사전 점검 (`--full` Compose, `--e2e` A8, `--ready` 전체) |
| `npm run eval:search` | 검색 품질 CLI 평가 (Hit@3 게이트, 기본 80%) |
| `npm run index:vault` | vault 전체 인덱싱 |
| `npm run index:vault -- --incremental` | vault 증분 인덱싱 |
| `npm run harness:quality` | 5팀 하네스 (Hit@3·인덱스·RBAC, `index:vault` 선행) |
| `npm run quality:gate` | index:vault + harness (배포·PR 전 권장) |
| `npm run quality:full` | quality:gate + quality:loop (전체) |
| `npm run quality:loop` | lint → test → harness → build → e2e |
| `npm run db:init` | PgVector 스키마 생성 |
| `npm run db:migrate` | vectors.json → PgVector 이전 |
| `npm run pilot:ready` | B-Day 전 전체 자동 점검 |
| `npm run pilot:env-bday` | B-Day env (SLACK·웹훅) + Compose 반영 |
| `npm run pilot:a10-setup` | A10 웹훅 저장 + Slack 알림 검증 |
| `npm run pilot:closeout-loop` | 마무리 3회 검증 (`--quick` 옵션) |
| `npm run pilot:bday` | B-Day B1~B3 (계정·Slack·health) |
| `npm run pilot:bday -- --step b4` | B4 Slack `/corpbrain` 스모크 |
| `npm run pilot:bday -- --all` | A10 + B1~B4 일괄 |
| `npm run report:feedback` | 피드백 집계 (PILOT_QUALITY §3) |
| `npm run report:pilot-weekly` | D+7 주간 리포트 → `data/reports/pilot-weekly-*.md` |

---

## 테스트

### 단위 (Vitest)

- `src/lib/rbac.test.ts` — Role 계층, 업로드·인덱싱 권한
- `src/lib/auth/role-mapping.test.ts` — SSO 도메인·Role 매핑
- `src/lib/search/metrics.test.ts` — Hit@K, MRR
- `src/lib/search/korean-query.test.ts` — 한국어 쿼리 정규화·동의어
- `src/lib/search/query-context.test.ts` — 멀티턴 검색 쿼리
- `src/lib/vault/tree.test.ts` — 문서 트리 빌드
- `src/lib/chat/messages.test.ts` — UIMessage 변환
- `src/lib/chat/follow-up-suggestions.test.ts` — 후속 질문 제안
- `src/lib/documents/highlight-chunk.test.ts` — 출처 청크 하이라이트
- `src/lib/parsers/index.test.ts` — 확장자·plain text 청킹
- `src/lib/audit/siem.test.ts` — 문서 만료 검사
- `.ax/harnesses/quality.test.ts` — 품질 하네스

### E2E (Playwright, 32개)

- 로그인·RBAC·Health API (`auth`, `pilot`)
- 채팅 UI·도움말·후속 질문 칩 (`chat`)
- 문서 트리 검색·보기/질문 분리 (`document-tree`)
- 출처 뱃지·원문 모달·청크 하이라이트 (`citation-preview`)
- Ollama RAG 스트리밍·피드백 (`rag-ollama`, 환경 없으면 skip)

CI: `/.github/workflows/ci.yml` + `quality-harness.yml` — push/PR 시 lint → unit → harness → build → e2e

---

## 실행 방법

### 클론 후 누구나 실행하기

저장소를 클론하면 **코드·샘플 문서·시드 계정·테스트**까지 포함되어 있어, 아래 **필수 준비**만 갖추면 누구나 로컬에서 UI·RAG를 돌려볼 수 있습니다.

#### 레포에 포함된 것 (Git)

| 항목 | 설명 |
|------|------|
| 앱 소스 | Next.js 16, API, UI 전체 |
| `vault/` | NovaPay 샘플 사내 문서 **22종** (부서·RBAC별) |
| 시드 계정 | `src/lib/auth/users.ts` — 5종 (비밀번호 PoC: `novapay2026`) |
| `docker-compose.yml` | app + PostgreSQL(PgVector) + Redis |
| 품질·파일럿 스크립트 | `pilot:ready`, `smoke:compose`, `eval:search` 등 |
| E2E·단위 테스트 | Playwright, Vitest |

#### Git에 **없는** 것 (클론 후 생성)

| 항목 | 생성 방법 |
|------|-----------|
| `.env.local` | `cp .env.example .env.local` + `AUTH_SECRET` 입력 |
| 벡터 인덱스 | `npm run index:vault` 또는 Admin **Sync Vault** (최초 1회 필수) |
| `src/data/vectors.json` | 인덱싱 시 자동 생성 (`.gitignore`) |
| Slack·웹훅 시크릿 | 선택 — [RUNBOOK §2.4](docs/RUNBOOK.md) |

#### 클론한 사람이 준비할 것

| 구분 | 항목 | 용도 |
|------|------|------|
| **필수** | Node.js 20+, npm | 앱 실행 |
| **필수** | Ollama + `llama3` | RAG 답변 (로컬 LLM, API 키 불필요) |
| **필수** | `AUTH_SECRET` (32자+) | `.env.local` — `openssl rand -base64 32` |
| 선택 | Docker Desktop / Colima | Compose 운영 스모크 (`:3100`) |
| 선택 | Slack / Google SSO | 웹 UI만 쓰면 **불필요** |

#### 실행 경로 2가지

| 모드 | 명령 | URL | 벡터 DB | 용도 |
|------|------|-----|---------|------|
| **개발** | `npm run dev` | http://localhost:3000 | `vectors.json` | 코드 수정·빠른 확인 |
| **Compose** | `./scripts/deploy-compose.sh` | http://localhost:**3100** | PgVector | 운영에 가까운 스모크·파일럿 |

#### Docker Compose를 쓰면 좋은 점

| 장점 | 설명 |
|------|------|
| **운영과 동일 스택** | 앱 + **PgVector** + **Redis**를 한 번에 — `npm run dev`의 `vectors.json`과 달리 실제 배포 DB·캐시 구성을 검증 |
| **환경 재현** | 클론한 사람마다 `deploy-compose.sh` 한 번으로 **동일한 :3100** 환경 — “내 맥에서만 됨” 방지 |
| **파일럿 게이트** | `smoke:compose`, `pilot:ready`가 **Compose 기준**으로 health·Hit@3·E2E를 돌림 |
| **포트 분리** | dev `:3000` / Compose `:3100` / E2E `:3001` — 동시에 띄워도 충돌 없음 |
| **격리** | DB·Redis가 컨테이너 안 — 로컬 PostgreSQL·Node 버전과 섞이지 않음 |

Docker Desktop·Colima는 **Compose를 돌리기 위한 Docker 엔진**입니다. UI만 보려면 `npm run dev`로도 충분하고, **파일럿·납품 검증**에는 Compose를 권장합니다.

> E2E 테스트는 내부적으로 **:3001** 포트를 사용합니다.

상세: [`docs/deliverables/08_개발환경구성서.md`](docs/deliverables/08_개발환경구성서.md) · 배포: [`docs/DEPLOY.md`](docs/DEPLOY.md)

### 처음 시작 — 개발 모드 (체크리스트)

```bash
git clone https://github.com/dayainow/corp-brain.git && cd corp-brain
cp .env.example .env.local
# AUTH_SECRET=$(openssl rand -base64 32)  ← .env.local에 입력

npm install
ollama run llama3          # 별도 터미널, 최초 1회 모델 다운로드
npm run dev                # http://localhost:3000
```

1. `lee.minho@novapay.kr` / `novapay2026` 로그인 (admin)
2. **Sync Vault** 클릭 → `vault/` 인덱싱
3. 왼쪽 **사내 문서 트리**에서 `연차 휴가 규정` **질문** 버튼 또는 "우리 회사 휴가 규정 알려줘" 질의
4. `[출처: 연차휴가규정.md]` 확인
5. general 계정(`kim.junho@novapay.kr`)으로 NDA 질의 → 권한 밖 문서·트리 노드 미노출 확인

### Docker Compose (운영 스모크)

Compose는 **앱 + PgVector + Redis**를 컨테이너로 한 번에 띄웁니다. Ollama만 호스트에서 별도 실행합니다.

```bash
cp .env.example .env.local
# AUTH_SECRET 설정 후

./scripts/deploy-compose.sh    # postgres + redis + app → :3100
ollama run llama3              # 별도 터미널
# 브라우저: http://localhost:3100
# Admin → Sync Vault (또는 npm run index:vault, VECTOR_STORE=pgvector)
```

일괄 검증:

```bash
npm run smoke:compose          # 배포 + 인덱싱 + health + Hit@3
npm run pilot:ready            # Compose + E2E + RAG (파일럿 게이트)
```

수동 단계만:

```bash
docker compose up -d postgres redis
npm run db:init
VECTOR_STORE=pgvector DATABASE_URL=postgresql://corpbrain:corpbrain@localhost:5433/corpbrain npm run index:vault
docker compose up -d --build app
```

---

## 환경 변수

| 변수 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `AUTH_SECRET` | O | — | NextAuth JWT 서명 |
| `AUTH_URL` | O | `http://localhost:3000` | 콜백 URL |
| `VAULT_PATH` | | `./vault` | 문서 Vault |
| `EMBEDDING_MODEL` | | `Xenova/multilingual-e5-small` | 로컬 임베딩 모델 |
| `OLLAMA_BASE_URL` | | `http://localhost:11434/v1` | Ollama API |
| `OLLAMA_MODEL` | | `llama3` | LLM 모델 |
| `RAG_TOP_K` | | `5` | 검색 청크 수 |
| `CROSS_ENCODER_MODEL` | | 빈 값(비활성) | Cross-encoder 모델 ID |
| `CROSS_ENCODER_TOP_N` | | `10` | Cross-encoder 재정렬 후보 수 |
| `CROSS_ENCODER_WEIGHT` | | `2` | Cross-encoder 점수 가중치 |
| `VECTOR_STORE` | | `json` | `json` \| `pgvector` |
| `DATABASE_URL` | pgvector 시 | — | PostgreSQL 연결 |
| `GOOGLE_CLIENT_ID/SECRET` | | — | Google SSO |
| `SLACK_SIGNING_SECRET` | | — | Slack 연동 |
| `SLACK_USER_MAP` | | — | Slack User ID → 이메일 (Role 매핑) |
| `AUDIT_WEBHOOK_URL` | | — | SIEM Webhook |
| `AUDIT_LOG_PATH` | | `./data/audit.log` | 감사 로그 |

전체: [`.env.example`](.env.example) · 중앙 설정: `src/lib/config.ts`

---

## 프로젝트 구조

```
corp-brain/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 채팅 UI + 문서 트리
│   │   ├── login/page.tsx        # 로그인
│   │   ├── admin/page.tsx        # Admin 대시보드
│   │   ├── guide/page.tsx        # 인앱 매뉴얼
│   │   └── api/
│   │       ├── chat/             # RAG 스트리밍 + feedback
│   │       ├── documents/tree/   # RBAC 문서 트리
│   │       ├── documents/search/ # 본문 키워드 검색
│   │       ├── documents/content/ # 출처 원문
│   │       ├── upload/           # 문서 업로드
│   │       ├── index/            # Sync Vault (전체/증분)
│   │       ├── health/           # 헬스체크
│   │       ├── slack/command/    # Slack Slash
│   │       └── admin/            # audit, documents, metrics
│   ├── components/
│   │   ├── chat-message.tsx      # Markdown + 출처 뱃지
│   │   ├── chat-streaming-status.tsx  # RAG 단계 표시
│   │   ├── citation-source-cards.tsx  # 참고 문서 카드
│   │   ├── follow-up-chips.tsx   # 후속 질문 칩
│   │   ├── chat-feedback.tsx     # 👍/👎 피드백
│   │   ├── document-tree.tsx     # 사내 문서 트리·이름 검색·보기/질문
│   │   ├── keyword-search-results.tsx  # 메인 본문 키워드 검색 결과
│   │   ├── document-preview-modal.tsx  # 출처 원문 모달
│   │   ├── document-upload.tsx   # 업로드 모달
│   │   ├── help-panel.tsx        # 도움말 패널
│   │   └── providers.tsx         # SessionProvider
│   ├── lib/
│   │   ├── vault/                # scan, tree (문서 트리)
│   │   ├── chat/                 # RAG, messages, follow-up-suggestions
│   │   ├── documents/            # preview-target, highlight-chunk
│   │   ├── indexer/              # 청킹, 증분 sync, manifest
│   │   ├── parsers/              # PDF, DOCX
│   │   ├── vector-store/         # JSON / PgVector ANN
│   │   ├── search/               # reranker, korean-query, keyword-vault, metrics
│   │   ├── auth/                 # users, guard, role-mapping, slack-mapping
│   │   ├── audit/                # writeAuditLog, siem
│   │   ├── embeddings/           # Transformers.js
│   │   ├── guide/                # 인앱 가이드 콘텐츠
│   │   ├── db/                   # schema.sql, client
│   │   ├── config.ts
│   │   ├── rbac.ts
│   │   └── rate-limit/           # Redis+메모리 Rate limit
│   ├── auth.ts
│   └── middleware.ts
├── .ax/harnesses/                # 5팀 Quality Harness
├── e2e/                          # Playwright
├── scripts/                      # db:init, db:migrate, eval:search, pilot-preflight
├── data/eval-queries.json
├── vault/                        # 부서·권한별 문서 Vault (README.md 참고)
├── docker-compose.yml            # postgres + app
├── Dockerfile                    # Next.js standalone
└── docs/
    ├── UPGRADE_PLAN.md
    └── deliverables/           # 납품 산출물 11종
```

---

## 구현 현황 (Phase별)

### Phase 1 — PoC

- [x] 하이brid 검색 (Vector + Keyword + RRF)
- [x] Semantic Chunking (마크다운 헤더)
- [x] Frontmatter RBAC Pre-filtering
- [x] Ollama + Vercel AI SDK v6 스트리밍
- [x] 출처 뱃지 `[출처: filename.md]`
- [x] vault/ 사내 문서 22종

### Phase 2 — 인증 & 영속화

- [x] NextAuth v5 (Credentials + Google OAuth)
- [x] Middleware + `requireAuth()` API Guard
- [x] NovaPay 시드 계정 5종 (bcrypt)
- [x] SSO Role 자동 매핑 (`role-mapping.ts`)
- [x] VectorStore interface + JSON / PgVector
- [x] docker-compose, `db:init`, `db:migrate`
- [x] 문서 Upload UI + 증분 인덱싱
- [x] PDF/DOCX 파싱 (pdf-parse, mammoth)
- [x] react-markdown + GFM
- [x] `.env.example`, `lib/config.ts`

### Phase 3 — 운영 & 품질

- [x] Re-ranking 2차 정렬
- [x] Hit@K / MRR 메트릭 + eval-queries + Admin API
- [x] Rate limiting (chat 20/min)
- [x] `/api/health`
- [x] Vitest 46 tests + Quality Harness
- [x] Playwright E2E + GitHub Actions CI
- [x] Dockerfile (standalone)

### Phase 4 — 엔터프라이즈

- [x] Admin 대시보드 (로그, 문서, 메트릭)
- [x] 감사 로그 + SIEM Webhook
- [x] Slack Slash Command
- [x] 문서 만료 정책 (`expires` frontmatter)

### Phase 5 — 품질·연동 강화

- [x] PgVector ANN 검색 + ILIKE 하이브리드
- [x] 증분 Sync (mtime/hash manifest)
- [x] 한국어 검색 정규화·동의어 리랭킹
- [x] 멀티턴 `buildSearchQuery`
- [x] 답변 👍/👎 피드백 + 감사 로그
- [x] Slack RAG + `SLACK_USER_MAP` Role 매핑
- [x] 인앱 가이드 (`/guide`)·온보딩 배너
- [x] **권한별 사내 문서 트리** 사이드바
- [x] 납품 산출물 11종 (`docs/deliverables/`)

### Phase 6 — 안정화/확장

- [x] Hit@3 80% 게이트 상향 (CI + eval)
- [x] Redis 기반 Rate limit fallback 구조
- [x] Compose 배포 문서/스크립트 (`docs/DEPLOY.md`, `deploy:compose`, 호스트 **:3100**)
- [x] Cross-encoder 옵션형 리랭킹 경로 추가
- [x] 파일럿 기술 준비 완료 (`PILOT_TECH_READY`, `pilot:ready`)
- [ ] 파일럿 오픈 선언 (수동: `PILOT_DECLARATION`)
- [x] **답변 신뢰 UX** — RAG 단계·참고 문서 카드·청크 하이라이트
- [x] **후속 질문 칩** · 문서 트리 **보기/질문** 분리 · 모바일 safe-area
- [x] **본문 키워드 검색** — 메인 AI/본문 모드 전환, `GET /api/documents/search`
- [x] Cross-encoder ON/OFF A/B 평가 자동화 (`npm run eval:cross-encoder-ab`)
- [ ] Microsoft Teams 봇
- [x] `ko-sroberta` 임베딩 A/B (`npm run eval:embedding-ab`)
- [ ] K8s 배포, 2FA TOTP, 멀티 테넌트

---

## 트러블슈팅

| 증상 | 해결 |
|------|------|
| Sync Vault 실패 | `.env.local`에 `VAULT_PATH=./vault` 확인 |
| 채팅 500 에러 | Ollama 실행 여부 (`ollama run llama3`) |
| 로그인 안 됨 | `AUTH_SECRET` 32자 이상 설정 |
| 빈 답변 / no context | Admin으로 Sync Vault 먼저 실행 |
| PgVector 연결 실패 | `docker compose up -d postgres` 후 `db:init` |
| 문서 트리가 비어 있음 | Admin으로 Sync Vault 실행 후 새로고침 |
| 권한 밖 문서가 트리에 보임 | 로그인 Role 확인 (general은 manager/admin 문서 숨김) |
| 본문 검색 결과 없음 | Admin → Sync Vault 후 재시도 |
| Google 로그인 버튼 없음 | `GOOGLE_CLIENT_ID/SECRET` env 설정 |

---

## 기여

이슈·PR: [dayainow/corp-brain](https://github.com/dayainow/corp-brain)

- 아키텍처·NovaPay 도입 계획: [`docs/UPGRADE_PLAN.md`](docs/UPGRADE_PLAN.md)
- 납품 산출물 (11종): [`docs/deliverables/README.md`](docs/deliverables/README.md)
- 환경 변수 템플릿: [`.env.example`](.env.example)
