# 06. API 연동 명세서

| 항목 | 내용 |
|------|------|
| 프로젝트명 | CorpBrain |
| Base URL | `http://localhost:3000` (개발) |
| 문서 버전 | v1.0 |
| 작성일 | 2026-07-02 |

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
| GET | `/api/health` | 공개 | 헬스체크 |
| GET | `/api/admin/audit` | admin | 감사 로그 |
| GET | `/api/admin/documents` | admin | 문서 통계 |
| GET | `/api/admin/metrics` | admin | 검색 메트릭 |
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

**Response**: `text/event-stream` (AI SDK UIMessage stream)

**처리 흐름**: `buildSearchQuery` → `retrieveRagContext` → `streamRagResponse`

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

### GET `/api/health`

**Response** `200` (operational) / `503` (unhealthy)

```json
{
  "status": "ok",
  "chunkCount": 90,
  "vectorStore": "json",
  "checks": {
    "vectorStore": "ok",
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
