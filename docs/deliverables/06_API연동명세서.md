# 06. API 연동 명세서

| 항목 | 내용 |
|------|------|
| 프로젝트명 | CorpBrain |
| Base URL | `http://localhost:3000` (개발) |
| 문서 버전 | v1.2 |
| 작성일 | 2026-07-03 |

---

## 1. 공통

### 1.1 인증

- 대부분 API: NextAuth 세션 쿠키 필요
- 예외: `/api/health`, `/api/auth/*`, `/api/slack/*`

### 1.2 에러 형식

```json
{
  "error": "메시지",
  "code": "ERROR_CODE"
}
```

### 1.3 Rate Limit

| API | 제한 |
|-----|------|
| `/api/chat` | 20 req/min/user |
| `/api/upload` | 10 req/min/user |
| `/api/index` | 2 req/hour/user |
| `/api/slack/command` | 30 req/min/user |

초과 시 `429` + `Retry-After` 헤더

---

## 2. REST API 목록

| Method | Path | 권한 | 설명 |
|--------|------|------|------|
| POST | `/api/chat` | 로그인 | RAG 스트리밍 |
| POST | `/api/chat/feedback` | 로그인 | 답변 피드백 |
| POST | `/api/index` | admin | Vault 인덱싱 |
| POST | `/api/upload` | manager+ | 문서 업로드 |
| GET | `/api/upload` | manager+ | 업로드 목록 |
| GET | `/api/documents/tree` | 로그인 | 권한별 문서 트리 |
| GET | `/api/documents/content` | 로그인 | 출처 원문 조회 |
| GET | `/api/health` | 공개 | 헬스체크 |
| GET | `/api/admin/audit` | admin | 감사 로그 |
| GET | `/api/admin/documents` | admin | 문서 통계 |
| GET | `/api/admin/feedback` | admin | 피드백 집계·👎 Top 질문 |
| POST | `/api/slack/command` | Slack HMAC | Slash Command |
| POST | `/api/auth/audit` | 로그인 | 로그인 감사 |

---

## 3. API 상세

### POST `/api/chat`

**Request**
```json
{
  "messages": [
    {
      "role": "user",
      "parts": [{ "type": "text", "text": "연차 규정 알려줘" }]
    }
  ]
}
```

**Response**: `text/event-stream` (AI SDK `createUIMessageStreamResponse`)

**처리 흐름**: `buildSearchQuery` → `retrieveRagContext` → `createUIMessageStream` → `streamRagResponse`

#### 스트리밍 이벤트 순서

| 순서 | `type` | `transient` | `data` | UI 소비 |
|------|--------|-------------|--------|---------|
| 1 | `data-rag-status` | true | `{ "phase": "searching" }` | `ChatStreamingStatus` |
| 2 | `data-rag-status` | true | `{ "phase": "generating" }` | 단계 전환 |
| 3 | `data-rag-sources` | — | `{ "sources": RagSourceCard[] }` | `CitationSourceCards` |
| 4+ | `text-start` / `text-delta` / `text-end` | — | assistant 본문 토큰 | `ChatMessageContent` |

**`RagSourceCard`**

```json
{
  "fileName": "연차휴가규정.md",
  "displayName": "연차휴가규정",
  "snippet": "입사 1년 이상 근로자에게…",
  "chunkText": "전체 RAG 청크 텍스트 (원문 하이라이트용)"
}
```

클라이언트: `useChat` + `onData` → `part.type === "data-rag-status"` 시 `ragPhase` 갱신.  
타입 정의: `lib/chat/ui-message.ts` (`CorpBrainUIMessage`).

**예시 (SSE 페이로드 발췌)**

```
data: {"type":"data-rag-status","data":{"phase":"searching"},"transient":true}
data: {"type":"data-rag-sources","id":"rag-sources","data":{"sources":[...]}}
data: {"type":"text-delta","delta":"연차는 "}
```

---

### POST `/api/chat/feedback`

**Request**
```json
{
  "rating": "up",
  "messageId": "msg-xxx",
  "query": "연차 규정",
  "sources": ["연차휴가규정.md"]
}
```

**Response**
```json
{ "success": true }
```

---

### POST `/api/index`

**Request** (선택 body)
```json
{ "mode": "full" }
```
또는 `{ "mode": "incremental" }`

**Response**
```json
{
  "success": true,
  "result": {
    "mode": "full",
    "files": 22,
    "chunks": 90
  }
}
```

---

### POST `/api/upload`

**Request**: `multipart/form-data`

| Field | Type | 필수 | 설명 |
|-------|------|------|------|
| file | File | O | .md, .pdf, .docx (≤5MB) |
| role | string | | general / manager / admin |

**Response**
```json
{
  "success": true,
  "fileName": "1234567890_문서.md",
  "chunks": 5
}
```

---

### GET `/api/documents/tree`

**권한**: 로그인 (세션 `role` 기반 Pre-filtering)

**Response**
```json
{
  "tree": {
    "id": "/",
    "name": "vault",
    "type": "folder",
    "children": [
      {
        "id": "/전사공통/인사/연차휴가규정.md",
        "name": "연차휴가규정.md",
        "type": "file",
        "title": "연차휴가규정",
        "fileName": "연차휴가규정.md",
        "fileType": "md",
        "role": "general"
      }
    ]
  },
  "stats": {
    "visibleCount": 22,
    "byRole": { "general": 12, "manager": 7, "admin": 3 }
  }
}
```

---

### GET `/api/documents/content?fileName={fileName}`

**권한**: 로그인 + RBAC (해당 문서 `role` 이하만)

**Query**

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| fileName | O | vault 내 파일명 (경로 구분자·`..` 금지) |

**Response** `200`
```json
{
  "fileName": "연차휴가규정.md",
  "title": "연차휴가규정",
  "fileType": "md",
  "relativePath": "전사공통/인사/연차휴가규정.md",
  "content": "# 연차휴가규정\n..."
}
```

**에러**

| 코드 | 조건 |
|------|------|
| 400 | `fileName` 누락 |
| 404 | 문서 없음 또는 열람 권한 없음 |
| 500 | 파싱·IO 오류 |

---

### GET `/api/health`

**Response** `200` (operational) / `503` (unhealthy)

```json
{
  "status": "ok",
  "chunkCount": 96,
  "vectorStore": "pgvector",
  "checks": {
    "vectorStore": "ok",
    "postgres": "ok",
    "redis": "ok",
    "vault": "ok",
    "ollama": "ok"
  }
}
```

`status`: `ok` | `degraded` | `unhealthy`

---

### GET `/api/admin/audit?limit=100`

**Response**
```json
{
  "logs": [
    {
      "timestamp": "2026-07-02T02:00:00.000Z",
      "action": "chat.query",
      "userEmail": "kim.junho@novapay.kr",
      "userRole": "general",
      "detail": {}
    }
  ]
}
```

---

### GET `/api/admin/metrics?refresh=true`

**Response**
```json
{
  "metrics": {
    "hitAt1": 0.75,
    "hitAt3": 0.625,
    "mrr": 0.8,
    "queryCount": 8,
    "targetHitAt3": 0.8
  }
}
```

---

## 4. 외부 연동

### 4.1 Ollama

| 항목 | 값 |
|------|-----|
| URL | `OLLAMA_BASE_URL` (기본 `http://localhost:11434/v1`) |
| Model | `llama3` |
| 프로토콜 | OpenAI 호환 Chat Completions |

### 4.2 Google Workspace SSO

| 항목 | 값 |
|------|-----|
| Provider | NextAuth Google |
| 도메인 제한 | `@novapay.kr` |
| Role | `resolveRoleFromSSO` |

### 4.3 Slack

| 항목 | 값 |
|------|-----|
| Command | `/corpbrain [질문]` |
| 검증 | `x-slack-signature`, timestamp |
| Role | `SLACK_USER_MAP` env |
| 응답 | Ollama `generateRagAnswer` |

### 4.4 SIEM (선택)

| 항목 | 값 |
|------|-----|
| Webhook | `AUDIT_WEBHOOK_URL` |
| 이벤트 | audit.log 실시간 전송 |

---

## 5. 변경 이력

| 버전 | 일자 | 변경 내용 |
|------|------|-----------|
| v1.0 | 2026-07-02 | 최초 작성 |
| v1.1 | 2026-07-03 | 문서 트리·원문 API, health pgvector/redis 필드 |
| v1.2 | 2026-07-03 | `/api/chat` UIMessage data parts (`data-rag-status`, `data-rag-sources`) |
