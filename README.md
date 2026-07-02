# CorpBrain

**NovaPay(노바페이)** 사내 지식 베이스를 위한 엔터프라이즈급 **로컬 RAG 챗봇**입니다.  
RBAC 권한 관리, NextAuth 인증, 하이브리드 검색 + Re-ranking, PDF/DOCX 파싱, Slack 연동까지 지원합니다.

> 타깃 고객사: 주식회사 노바페이 — B2B 결제·정산 FinTech, 임직원 320명  
> 상세 계획서: [`docs/UPGRADE_PLAN.md`](docs/UPGRADE_PLAN.md)

---

## 주요 기능

| 영역 | 기능 |
|------|------|
| **검색** | 하이브리드 검색 (Vector + Keyword) → RRF → Re-ranking 2차 정렬 |
| **청킹** | 마크다운 헤더 기반 Semantic Chunking, PDF/DOCX plain text 분할 |
| **권한** | Frontmatter RBAC + NextAuth 세션 기반 서버측 검증 |
| **인증** | Credentials 데모 계정 + Google Workspace SSO (`@novapay.kr`) |
| **문서** | `.md` / `.pdf` / `.docx` 업로드 + 자동 증분 인덱싱 |
| **만료** | `expires: YYYY-MM-DD` frontmatter → 만료 문서 검색 제외 |
| **프라이버시** | Ollama + Transformers.js — 외부 API 키 불필요 |
| **관측** | 감사 로그, SIEM Webhook, Admin 대시보드, Hit@K/MRR 메트릭 |
| **연동** | Slack Slash Command (`/corpbrain`), Docker, GitHub Actions CI |

---

## 시스템 아키텍처

```mermaid
flowchart TB
    subgraph Clients["접근 채널"]
        Browser["Browser<br/>Chat UI + Admin"]
        Slack["Slack<br/>/corpbrain"]
    end

    subgraph Auth["인증 계층"]
        NextAuth["NextAuth v5"]
        Creds["Credentials<br/>NovaPay 데모"]
        Google["Google SSO<br/>@novapay.kr"]
        Middleware["Middleware<br/>라우트 보호"]
    end

    subgraph App["Next.js 16 App Router"]
        ChatAPI["/api/chat"]
        UploadAPI["/api/upload"]
        IndexAPI["/api/index"]
        AdminAPI["/api/admin/*"]
        SlackAPI["/api/slack/command"]
        HealthAPI["/api/health"]
    end

    subgraph RAG["RAG Pipeline"]
        Parsers["parsers<br/>MD · PDF · DOCX"]
        Indexer["indexer<br/>Chunking + Meta"]
        Embed["embeddings<br/>Transformers.js"]
        VS["vector-store<br/>JSON / PgVector"]
        Rerank["reranker<br/>2차 정렬"]
        Metrics["metrics<br/>Hit@K · MRR"]
    end

    subgraph Infra["인프라"]
        Vault[("Document Vault<br/>sample-docs/")]
        PG[("PostgreSQL<br/>+ PgVector")]
        Ollama["Ollama :11434<br/>llama3"]
        Audit["audit.log<br/>+ SIEM Webhook"]
    end

    Browser --> Middleware --> NextAuth
    Creds & Google --> NextAuth
    Browser --> ChatAPI & UploadAPI & AdminAPI
    Slack --> SlackAPI

    UploadAPI --> Parsers --> Indexer
    IndexAPI --> Indexer
    Indexer --> Embed --> VS
    VS --> Vault & PG

    ChatAPI --> Embed --> VS --> Rerank --> Ollama
    ChatAPI & SlackAPI --> Audit
    AdminAPI --> Metrics
```

| 레이어 | 기술 | 역할 |
|--------|------|------|
| **Presentation** | React 19, TailwindCSS 4, react-markdown | 채팅 UI, Admin 대시보드, 출처 뱃지 |
| **인증** | NextAuth v5, Middleware | 세션 JWT, RBAC 서버 검증 |
| **API** | Next.js Route Handlers, AI SDK v6 | 스트리밍 채팅, 업로드, Slack |
| **RAG** | Indexer, Parsers, Embeddings, Vector Store, Reranker | 청킹 → 임베딩 → 검색 → 2차 정렬 |
| **Inference** | Ollama (llama3), Transformers.js | LLM 생성, 로컬 임베딩 (384차원) |
| **Storage** | JSON / PgVector, Markdown Vault | 벡터 인덱스, 원본 문서 |
| **Observability** | audit.log, SIEM Webhook, `/api/health` | 감사, 모니터링 |

---

## 인증 & RBAC 플로우

```mermaid
sequenceDiagram
    actor User as NovaPay 직원
    participant Login as /login
    participant Auth as NextAuth
    participant MW as Middleware
    participant API as API Routes

    alt Credentials 로그인
        User->>Login: email + password
        Login->>Auth: signIn("credentials")
    else Google SSO
        User->>Login: Google Workspace 클릭
        Login->>Auth: signIn("google")
        Note over Auth: @novapay.kr 도메인 검증<br/>이메일 → Role 자동 매핑
    end

    Auth-->>User: JWT 세션 (8시간)

    User->>MW: 채팅/API 요청
    MW->>Auth: 세션 검증
    Auth-->>MW: user.role (general/manager/admin)
    MW->>API: 인증된 요청
    API->>API: requireAuth() + RBAC Pre-filter
```

### 권한 매트릭스

```mermaid
flowchart LR
    subgraph Roles["사용자 Role"]
        G["general<br/>일반 직원"]
        M["manager<br/>팀장"]
        A["admin<br/>CSO/법무"]
    end

    subgraph Access["접근 권한"]
        Chat["채팅 질의"]
        Upload["문서 업로드"]
        Sync["Sync Vault"]
        Admin["Admin 대시보드"]
    end

    G --> Chat
    M --> Chat & Upload
    A --> Chat & Upload & Sync & Admin
```

| Role | 열람 문서 | 업로드 | Sync Vault | Admin |
|------|-----------|--------|------------|-------|
| `general` | general | — | — | — |
| `manager` | general + manager | O | — | — |
| `admin` | 전체 | O | O | O |

---

## RAG 검색 파이프라인 (Re-ranking 포함)

```mermaid
flowchart TD
    Q["사용자 질문"] --> Auth["세션 Role 검증"]
    Auth --> Embed["질문 임베딩<br/>Transformers.js"]
    Embed --> RBAC["RBAC Pre-filter<br/>+ 만료 문서 제외"]
    RBAC --> Pool["접근 가능 청크 풀"]

    Pool --> Vec["Vector Rank<br/>Cosine Similarity"]
    Pool --> Kw["Keyword Rank<br/>토큰 매칭"]
    Vec --> RRF["RRF 융합<br/>k=60"]
    Kw --> RRF

    RRF --> Top20["Top-20 후보"]
    Top20 --> Rerank["Re-ranker 2차 정렬<br/>제목·파일명·구문 매칭 부스트"]
    Rerank --> Top5["Top-5 청크"]
    Top5 --> Prompt["System Prompt 조립"]
    Prompt --> Ollama["Ollama llama3<br/>스트리밍 응답"]
    Ollama --> UI["Markdown + 출처 뱃지"]
```

---

## 문서 인덱싱 플로우

### 전체 재인덱싱 (Admin — Sync Vault)

```mermaid
sequenceDiagram
    actor Admin
    participant API as POST /api/index
    participant Idx as indexer
    participant Parser as parsers
    participant Emb as embeddings
    participant VS as vector-store

    Admin->>API: Sync Vault (Admin only)
    loop Vault 내 모든 문서
        alt .md
            Idx->>Idx: Frontmatter 파싱<br/>(role, title, expires)
            Idx->>Idx: 헤더 기반 Semantic Chunking
        else .pdf
            Idx->>Parser: pdf-parse 텍스트 추출
            Parser-->>Idx: plain text
            Idx->>Idx: 길이 기반 Chunking (1000자)
        else .docx
            Idx->>Parser: mammoth 텍스트 추출
            Parser-->>Idx: plain text
        end
        loop 각 청크
            Idx->>Emb: generateEmbedding()
            Emb-->>Idx: 384차원 벡터
        end
    end
    Idx->>VS: saveAll() — JSON 또는 PgVector
```

### 증분 인덱싱 (Manager+ — 문서 업로드)

```mermaid
sequenceDiagram
    actor Manager
    participant UI as Upload Modal
    participant API as POST /api/upload
    participant Vault as uploads/
    participant Idx as indexSingleFile

    Manager->>UI: .md / .pdf / .docx 선택 + role 지정
    UI->>API: multipart/form-data
    API->>Vault: 파일 저장 + .meta.json (PDF/DOCX)
    API->>Idx: 해당 파일만 재인덱싱
    Idx-->>API: { chunks: N }
    API-->>UI: 업로드 및 인덱싱 완료
```

---

## 문서 형식 & Frontmatter

```mermaid
flowchart LR
    subgraph Formats["지원 형식"]
        MD[".md / .markdown<br/>Frontmatter + 헤더 청킹"]
        PDF[".pdf<br/>pdf-parse 추출"]
        DOCX[".docx<br/>mammoth 추출"]
    end

    subgraph Meta["메타데이터"]
        FM["Frontmatter<br/>role · title · expires"]
        Sidecar[".meta.json<br/>PDF/DOCX sidecar"]
    end

    MD --> FM
    PDF & DOCX --> Sidecar
    FM & Sidecar --> Index["벡터 인덱스<br/>metadata.role 저장"]
```

```yaml
---
role: manager          # general | manager | admin
title: Q2 실적 보고서
expires: 2027-06-30    # 만료 후 검색 제외
---
```

---

## 배포 아키텍처

```mermaid
flowchart TB
    subgraph Dev["로컬 개발"]
        DevServer["npm run dev"]
        OllamaLocal["Ollama localhost:11434"]
        JSONStore["vectors.json"]
    end

    subgraph Docker["Docker Compose"]
        AppContainer["corpbrain-app<br/>Next.js standalone"]
        PGContainer["corpbrain-pg<br/>PgVector pg16"]
        OllamaHost["Ollama (host)"]
    end

    subgraph CI["GitHub Actions"]
        Lint["eslint"]
        Unit["vitest — 20 tests"]
        Build["next build"]
        E2E["playwright e2e"]
    end

    Dev --> DevServer
    Docker --> AppContainer --> PGContainer
    AppContainer --> OllamaHost
    CI --> Lint & Unit & Build & E2E
```

---

## Slack 연동

```mermaid
sequenceDiagram
    actor Employee as NovaPay 직원
    participant Slack as Slack Workspace
    participant API as /api/slack/command
    participant RAG as RAG Pipeline

    Employee->>Slack: /corpbrain 휴가 규정 알려줘
    Slack->>API: POST (서명 검증)
    API->>RAG: hybridSearch(query)
    RAG-->>API: 관련 청크 + 출처
    API->>API: audit.log 기록
    API-->>Slack: 참고 문서 + 요약
    Slack-->>Employee: 채널 응답
```

---

## 프로젝트 구조

```mermaid
graph TD
    Root["corp-brain/"]

    Root --> App["src/app/"]
    Root --> Lib["src/lib/"]
    Root --> E2E["e2e/"]
    Root --> Docs["docs/ · sample-docs/ · data/"]

    App --> Pages["page.tsx · login/ · admin/"]
    App --> APIs["api/chat · upload · index<br/>admin/* · slack · health"]

    Lib --> Core["indexer · embeddings · parsers"]
    Lib --> Search["vector-store · search/reranker · search/metrics"]
    Lib --> Sec["auth/ · rbac · audit/ · rate-limit"]
    Lib --> DB["db/ — PgVector schema"]

    E2E --> Tests["auth.spec · chat.spec"]
```

| 경로 | 설명 |
|------|------|
| `src/app/` | 페이지 (채팅, 로그인, Admin) 및 API Routes |
| `src/lib/indexer/` | 문서 청킹, 증분/전체 인덱싱 |
| `src/lib/parsers/` | PDF/DOCX 텍스트 추출 |
| `src/lib/vector-store/` | JSON/PgVector 추상화, 하이브리드 검색 |
| `src/lib/search/` | Re-ranker, Hit@K/MRR 메트릭 |
| `src/lib/auth/` | NextAuth, Role 매핑, API Guard |
| `src/lib/audit/` | 감사 로그, SIEM Webhook, 만료 검사 |
| `e2e/` | Playwright E2E 테스트 |
| `data/eval-queries.json` | 검색 품질 평가셋 (8문항) |
| `docs/UPGRADE_PLAN.md` | NovaPay 실무 도입 계획서 |

---

## API 엔드포인트

| Method | Path | 권한 | 설명 |
|--------|------|------|------|
| `POST` | `/api/chat` | 로그인 | RAG 스트리밍 채팅 (Rate limit 20/min) |
| `POST` | `/api/upload` | manager+ | 문서 업로드 + 증분 인덱싱 |
| `POST` | `/api/index` | admin | Vault 전체 재인덱싱 |
| `GET` | `/api/health` | 공개 | 헬스체크 |
| `POST` | `/api/slack/command` | Slack 서명 | Slash Command |
| `GET` | `/api/admin/audit` | admin | 감사 로그 조회 |
| `GET` | `/api/admin/documents` | admin | 문서 목록 + 통계 |
| `GET` | `/api/admin/metrics` | admin | Hit@K, MRR 검색 품질 |

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | Next.js 16, React 19, TailwindCSS 4, react-markdown, Lucide |
| Auth | NextAuth v5 (Credentials + Google OAuth) |
| AI / LLM | Vercel AI SDK v6, Ollama (llama3), `@ai-sdk/openai` |
| Embedding | `@xenova/transformers` (all-MiniLM-L6-v2, 384d) |
| Vector DB | JSON 파일 / PostgreSQL + PgVector |
| Parsing | pdf-parse, mammoth (DOCX) |
| Test | Vitest (단위), Playwright (E2E) |
| CI/CD | GitHub Actions, Docker Compose |
| Observability | audit.log, SIEM Webhook, `/api/health` |

---

## 실행 방법

### 로컬 개발

```bash
git clone https://github.com/dayainow/corp-brain.git
cd corp-brain
cp .env.example .env.local
# AUTH_SECRET=$(openssl rand -base64 32)

npm install
ollama run llama3   # 별도 터미널
npm run dev         # http://localhost:3000
```

### Docker (PgVector)

```bash
docker compose up -d postgres
npm run db:init
VECTOR_STORE=pgvector npm run db:migrate
docker compose up app
```

### 테스트 & 평가

```bash
npm test              # Vitest 단위 테스트 (20개)
npm run test:e2e      # Playwright E2E (서버 실행 중)
npm run eval:search   # 검색 품질 평가 (Hit@K, MRR)
npm run lint
npm run build
```

---

## 데모 계정 (NovaPay)

| 이름 | 이메일 | 부서 | Role | 비밀번호 |
|------|--------|------|------|----------|
| 김준호 | kim.junho@novapay.kr | 엔지니어링 | general | novapay2026 |
| 박수연 | park.suyeon@novapay.kr | 재무회계 | manager | novapay2026 |
| 이민호 | lee.minho@novapay.kr | 법무·컴플라이언스 | admin | novapay2026 |

Google SSO: `@novapay.kr` 계정 (`.env`에 `GOOGLE_CLIENT_ID` 설정 필요)

---

## 환경 변수

```bash
# 필수
AUTH_SECRET=...
AUTH_URL=http://localhost:3000
VAULT_PATH=./sample-docs

# LLM
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3

# 벡터 DB (json | pgvector)
VECTOR_STORE=json
DATABASE_URL=postgresql://corpbrain:corpbrain@localhost:5432/corpbrain

# 선택 — Google SSO
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# 선택 — Slack / SIEM
SLACK_SIGNING_SECRET=...
AUDIT_WEBHOOK_URL=...
```

전체 목록: [`.env.example`](.env.example)

---

## 로드맵

```mermaid
timeline
    title CorpBrain 고도화 현황
    section Phase 1 — PoC
        하이브리드 검색 RRF : Semantic Chunking
        Frontmatter RBAC : Ollama 스트리밍
        합성 문서 20종 : sample-docs
    section Phase 2 — 인증 & 영속화
        NextAuth Credentials + Google SSO : 서버 RBAC
        PgVector + VectorStore 추상화 : 증분 인덱싱
        PDF/DOCX 파싱 : 문서 업로드 UI
    section Phase 3 — 운영 & 품질
        Re-ranking 2차 정렬 : Hit@K/MRR 메트릭
        Docker + GitHub Actions CI : Playwright E2E
        Rate Limiting : Health API
    section Phase 4 — 엔터프라이즈
        Admin 대시보드 : 감사 로그 + 문서 통계
        Slack Slash Command : SIEM Webhook
        문서 만료 정책 expires : ...
    section Phase 5+ — 향후
        Cross-encoder Re-ranking : Teams 봇
        한국어 임베딩 모델 : 멀티 테넌트
        K8s 프로덕션 배포 : 2FA TOTP
```

| Phase | 상태 | 주요 산출물 |
|-------|------|-------------|
| Phase 1 — PoC | 완료 | RRF 하이브리드 검색, RBAC, Ollama 연동 |
| Phase 2 — 인증 & 영속화 | 완료 | NextAuth, PgVector, PDF/DOCX, 업로드 |
| Phase 3 — 운영 & 품질 | 완료 | Re-ranking, E2E, CI/CD, Rate limit |
| Phase 4 — 엔터프라이즈 | 완료 | Admin, Slack, SIEM, 문서 만료 |
| Phase 5+ — 향후 | 예정 | Cross-encoder, Teams, K8s, 2FA |

---

## 기여

이슈와 PR은 [dayainow/corp-brain](https://github.com/dayainow/corp-brain)에서 환영합니다.

상세 아키텍처·NovaPay 도입 계획은 [`docs/UPGRADE_PLAN.md`](docs/UPGRADE_PLAN.md)를 참고하세요.
