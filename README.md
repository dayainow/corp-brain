# CorpBrain

엔터프라이즈급 권한 관리(RBAC)를 지원하는 **로컬 RAG(Retrieval-Augmented Generation) 기반 사내 문서 챗봇 시스템**입니다.

## ✨ 주요 기능

- **하이브리드 검색 (Hybrid Search)**: 벡터 유사도 기반의 의미론적 검색(Semantic Search)과 키워드(BM25) 검색을 융합하여 RRF 알고리즘으로 정확도 극대화
- **시맨틱 청킹 (Semantic Chunking)**: 단순 글자 수 단위가 아닌 마크다운 헤더(`#`, `##`) 단위로 텍스트를 청킹하여 문맥 보존
- **권한 관리 (RBAC - Role-Based Access Control)**: 
  - 각 문서의 Frontmatter(`role: admin | manager | general`)를 기반으로 열람 권한 차등 적용
  - 사용자의 권한 등급을 파악하여 **허가되지 않은 문서는 검색 및 참조 단계에서 원천 차단 (Pre-filtering)**
- **100% 로컬 프라이버시 유지**: `Ollama` 및 로컬 임베딩 모델(Transformers.js)을 사용하여 사내 기밀 문서를 외부 클라우드로 전송하지 않음
- **세션 기억 기능**: 브라우저 스토리지를 활용한 대화 내용 저장
- **출처 명시**: AI 답변 시 참고한 사내 문서의 정확한 파일명(출처 뱃지) 표기

---

## 🏗️ 시스템 아키텍처

```mermaid
flowchart TB
    subgraph Client["🖥️ Browser (React 19)"]
        UI["Chat UI<br/>page.tsx"]
        RoleSelect["Role Selector<br/>general · manager · admin"]
        LocalStorage["localStorage<br/>세션 기억"]
        UI --> RoleSelect
        UI --> LocalStorage
    end

    subgraph NextJS["⚡ Next.js 16 App Router"]
        ChatAPI["POST /api/chat"]
        IndexAPI["POST /api/index"]
    end

    subgraph Core["🧩 Core Libraries"]
        Indexer["indexer<br/>Semantic Chunking"]
        Embeddings["embeddings<br/>Transformers.js"]
        VectorStore["vector-store<br/>Hybrid Search + RBAC"]
    end

    subgraph Storage["💾 Local Storage"]
        Vault["sample-docs/<br/>Markdown Vault"]
        VectorsJSON["src/data/vectors.json<br/>In-memory Vector DB"]
    end

    subgraph LLM["🤖 Local LLM"]
        Ollama["Ollama :11434<br/>llama3"]
    end

    UI -->|"useChat (Vercel AI SDK v6)"| ChatAPI
    UI -->|"Sync Vault"| IndexAPI

    IndexAPI --> Indexer
    Indexer --> Vault
    Indexer --> Embeddings
    Indexer --> VectorStore
    VectorStore --> VectorsJSON

    ChatAPI --> Embeddings
    ChatAPI --> VectorStore
    VectorStore --> VectorsJSON
    ChatAPI -->|"streamText"| Ollama
    Ollama -->|"SSE Stream"| ChatAPI
    ChatAPI -->|"Streaming Response"| UI
```

| 레이어 | 기술 | 역할 |
|--------|------|------|
| **Presentation** | Next.js, React 19, TailwindCSS 4 | 채팅 UI, 권한 선택, 출처 뱃지 렌더링 |
| **API** | Next.js Route Handlers, Vercel AI SDK v6 | 스트리밍 채팅, 문서 인덱싱 트리거 |
| **RAG Pipeline** | Indexer, Embeddings, Vector Store | 청킹 → 임베딩 → 검색 → 컨텍스트 조립 |
| **Inference** | Ollama (llama3), Transformers.js | LLM 생성, 로컬 임베딩 (`Xenova/all-MiniLM-L6-v2`) |
| **Data** | Markdown Vault, `vectors.json` | 원본 문서, 벡터 인덱스 (현재 파일 기반) |

---

## 📥 문서 인덱싱 플로우 (Sync Vault)

`Sync Vault` 버튼을 누르면 `/sample-docs` 내 마크다운 문서가 벡터 인덱스로 변환됩니다.

```mermaid
sequenceDiagram
    actor User as 사용자
    participant UI as Chat UI
    participant API as POST /api/index
    participant Idx as indexer
    participant Emb as embeddings
    participant VS as vector-store
    participant Disk as vectors.json

    User->>UI: Sync Vault 클릭
    UI->>API: POST /api/index
    API->>Idx: runIndexing(VAULT_PATH)

    loop 각 .md 파일
        Idx->>Idx: Frontmatter 파싱 (role 추출)
        Idx->>Idx: 헤더 기반 Semantic Chunking
        loop 각 청크
            Idx->>Emb: generateEmbedding(chunk)
            Emb-->>Idx: float[] 벡터
            Idx->>Idx: VectorDocument 생성<br/>(id, text, metadata, embedding)
        end
    end

    Idx->>VS: saveVectors(vectorDocs)
    VS->>Disk: JSON 직렬화 저장
    VS-->>API: { files, chunks }
    API-->>UI: 인덱싱 완료 응답
```

---

## 💬 채팅 / RAG 질의 플로우

사용자 질문이 들어오면 **임베딩 → 하이브리드 검색 → 프롬프트 조립 → Ollama 스트리밍** 순으로 처리됩니다.

```mermaid
sequenceDiagram
    actor User as 사용자
    participant UI as Chat UI
    participant API as POST /api/chat?role=
    participant Emb as embeddings
    participant VS as vector-store
    participant LLM as Ollama (llama3)

    User->>UI: 질문 입력 + Role 선택
    UI->>API: messages[] + role 쿼리 파라미터

    API->>Emb: generateEmbedding(질문)
    Emb-->>API: queryEmbedding

    API->>VS: hybridSearch(query, embedding, topK=5, role)
    Note over VS: RBAC Pre-filter → Vector Rank → Keyword Rank → RRF 융합
    VS-->>API: Top-K 관련 청크

    API->>API: System Prompt + Context 조립<br/>[출처: filename.md] 지시 포함
    API->>LLM: streamText(model, system, messages)
    LLM-->>API: Token Stream (SSE)
    API-->>UI: Streaming Response
    UI->>UI: 출처 뱃지 파싱 & 렌더링
    UI-->>User: 실시간 답변 표시
```

---

## 🔐 RBAC 권한 필터링

문서별 `role` Frontmatter와 사용자 Role이 **검색 단계에서 사전 필터링**됩니다.

```mermaid
flowchart LR
    subgraph Docs["📄 Markdown 문서"]
        D1["role: general<br/>휴가 규정"]
        D2["role: manager<br/>Q2 실적 보고"]
        D3["role: admin<br/>NDA 계약서"]
    end

    subgraph Index["인덱싱 시"]
        Meta["metadata.role 저장"]
    end

    subgraph Search["검색 시 Pre-filter"]
        Filter{"userRole?"}
        G["general → general 문서만"]
        M["manager → general + manager"]
        A["admin → 전체 문서"]
    end

    Docs --> Meta --> Filter
    Filter -->|general| G
    Filter -->|manager| M
    Filter -->|admin| A

    G & M & A --> Hybrid["Hybrid Search (RRF)"]
```

| 사용자 Role | 열람 가능 문서 |
|-------------|----------------|
| `general` | `role: general` |
| `manager` | `role: general`, `role: manager` |
| `admin` | 모든 문서 |

---

## 🔍 하이브리드 검색 (RRF) 알고리즘

의미론적 검색과 키워드 검색의 순위를 **Reciprocal Rank Fusion(RRF)** 으로 융합합니다.

```mermaid
flowchart TD
    Q["사용자 질문"] --> RBAC["RBAC Pre-filter<br/>권한 없는 청크 제거"]
    RBAC --> Pool["후보 청크 풀"]

    Pool --> VecPath["Vector Path"]
    Pool --> KwPath["Keyword Path"]

    VecPath --> CosSim["Cosine Similarity<br/>queryEmbedding ↔ doc.embedding"]
    CosSim --> VecRank["벡터 순위 (vecRank)"]

    KwPath --> TokenMatch["토큰 매칭 스코어<br/>query tokens in chunk text"]
    TokenMatch --> KwRank["키워드 순위 (kwRank)"]

    VecRank --> RRF["RRF Score 계산<br/>1/(k+vecRank) + 1/(k+kwRank)<br/>k = 60"]
    KwRank --> RRF

    RRF --> TopK["Top-K 청크 반환<br/>(기본 K=5)"]
    TopK --> Context["LLM System Prompt Context"]
```

---

## 📂 프로젝트 구조

```mermaid
graph TD
    Root["corp-brain/"]

    Root --> App["src/app/"]
    Root --> Lib["src/lib/"]
    Root --> Data["src/data/"]
    Root --> Samples["sample-docs/"]

    App --> Page["page.tsx — Chat UI"]
    App --> ChatRoute["api/chat/route.ts — RAG + Stream"]
    App --> IndexRoute["api/index/route.ts — 인덱싱 API"]

    Lib --> Indexer["indexer/ — 청킹 & 인덱싱"]
    Lib --> Embeddings["embeddings/ — Transformers.js"]
    Lib --> VectorStore["vector-store/ — Hybrid Search"]

    Data --> VectorsJSON["vectors.json — 벡터 인덱스"]

    Samples --> Synthetic["synthetic_*.md — 합성 비즈니스 문서 20종"]
```

| 경로 | 설명 |
|------|------|
| `/src/app` | Next.js 앱 라우터 페이지 및 API 연동 |
| `/src/lib/vector-store` | 하이브리드 검색 및 벡터 스토리지 (`vectors.json`) |
| `/src/lib/indexer` | 마크다운 Semantic Chunking 및 임베딩 생성 |
| `/src/lib/embeddings` | Transformers.js 기반 텍스트 벡터 변환 |
| `/sample-docs` | 사내 규정, 인보이스, 계약서, 기안서 등 샘플 데이터 |

---

## 🛠️ 기술 스택

- **Frontend**: Next.js 16 (App Router), React 19, TailwindCSS 4, Lucide-React
- **Backend**: Next.js API Routes, Vercel AI SDK (v6), `@ai-sdk/openai`
- **LLM Engine**: Ollama (로컬 오픈소스 모델 구동)
- **Embedding**: `@xenova/transformers` (In-browser/Node.js 로컬 임베딩)

---

## 🚀 실행 방법

### 1. 사전 준비 (Prerequisites)
- [Node.js](https://nodejs.org/) (v18 이상 권장)
- [Ollama](https://ollama.com/) 설치 및 실행
  ```bash
  # Llama 3 모델 다운로드 및 실행
  ollama run llama3
  ```

### 2. 설치 및 실행 (Installation)
```bash
# 1. 레포지토리 클론
git clone https://github.com/dayainow/corp-brain.git
cd corp-brain

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행
npm run dev
```

### 3. 테스트 방법
1. 브라우저에서 `http://localhost:3000`에 접속합니다.
2. 우측 상단의 `Sync Vault` 버튼을 눌러 `/sample-docs` 폴더 내의 더미 마크다운 문서들을 인덱싱합니다.
3. 문서의 `role` 속성에 따라 `General`, `Manager`, `Admin` 권한을 선택하며 RAG가 권한에 맞게 답변하는지 테스트할 수 있습니다.

---

## 🗺️ 로드맵 (고도화 계획)

```mermaid
timeline
    title CorpBrain Evolution Roadmap
    section ✅ Phase 1 — PoC (완료)
        하이브리드 검색 & Semantic Chunking : RRF 알고리즘
        Frontmatter RBAC : 사전 필터링
        Ollama + AI SDK v6 : 스트리밍 호환성 해결
        합성 문서 20종 : sample-docs 세트
    section 🔄 Phase 2 — 인증 & 영속화
        NextAuth.js 연동 : Role을 UI 선택 → 실제 인증 기반
        PgVector / Pinecone : vectors.json → 상용 벡터 DB
        문서 업로드 UI : Vault 동기화 자동화
    section 📋 Phase 3 — UX & 품질
        react-markdown : 응답 마크다운 렌더링 개선
        Re-ranking : Cross-encoder 기반 2차 정렬
        관측성 : 검색 품질 메트릭 & 로깅
    section 🏢 Phase 4 — 엔터프라이즈
        SSO / LDAP 연동 : 사내 IdP 통합
        감사 로그 : 문서 접근 이력 추적
        멀티 테넌트 : 부서별 Vault 분리
```

| 우선순위 | 과제 | 현재 상태 | 목표 |
|----------|------|-----------|------|
| 🔴 High | NextAuth.js 연동 | UI 드롭다운 Role 선택 | JWT/세션 기반 실제 RBAC |
| 🔴 High | PgVector 도입 | `vectors.json` 파일 저장 | 영구 벡터 DB, 대용량 지원 |
| 🟡 Medium | 문서 업로드 UI | `sample-docs` 고정 경로 | 드래그앤드롭 업로드 & 재인덱싱 |
| 🟡 Medium | react-markdown | 커스텀 출처 파싱 | 표·코드블록 등 풍부한 렌더링 |
| 🟢 Low | Re-ranking | RRF 단일 단계 | Cross-encoder 2차 정렬 |
| 🟢 Low | SSO / 감사 로그 | 없음 | 엔터프라이즈 보안 요건 충족 |

---

## 📄 라이선스 & 기여

이 프로젝트는 지속적으로 고도화 중입니다. 이슈와 PR은 [dayainow/corp-brain](https://github.com/dayainow/corp-brain)에서 환영합니다.
