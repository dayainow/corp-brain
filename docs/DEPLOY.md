# CorpBrain 배포 가이드

> Phase 6 — PgVector + Redis + Docker Compose 운영 배포

---

## 1. 구성 요소

| 서비스 | 역할 | 포트 |
|--------|------|------|
| **app** | Next.js standalone | 3000 |
| **postgres** | PgVector (벡터 영속화) | 5432 |
| **redis** | Rate limit (다중 인스턴스 공유) | 6379 |
| **Ollama** (호스트) | LLM `llama3` | 11434 |

---

## 2. 빠른 배포

```bash
cp .env.example .env.local
# AUTH_SECRET=$(openssl rand -base64 32)

export AUTH_SECRET=...   # 또는 .env.local에 설정
chmod +x scripts/deploy-compose.sh
./scripts/deploy-compose.sh
```

스크립트가 수행하는 작업:

1. `postgres` + `redis` 기동
2. PgVector 스키마 초기화 (`npm run db:init`)
3. 앱 빌드·기동
4. `/api/health` 확인

---

## 3. 인덱싱 (필수)

배포 후 **반드시 1회** Vault 인덱싱이 필요합니다.

### 로컬 JSON (개발)

```bash
npm run index:vault
```

### PgVector (운영)

```bash
# 호스트에서 마이그레이션 (앱 컨테이너 기동 전/후)
VECTOR_STORE=pgvector \
DATABASE_URL=postgresql://corpbrain:corpbrain@localhost:5432/corpbrain \
npm run index:vault

# 또는 기존 JSON → PG 이전
VECTOR_STORE=pgvector npm run db:migrate
```

또는 Admin UI에서 **Sync Vault** 클릭.

---

## 4. 환경 변수 (운영)

| 변수 | 필수 | 설명 |
|------|------|------|
| `AUTH_SECRET` | O | JWT 서명 |
| `VECTOR_STORE` | | `pgvector` (Compose 기본) |
| `DATABASE_URL` | pgvector 시 | PostgreSQL |
| `REDIS_URL` | | `redis://redis:6379` (Compose 기본) |
| `OLLAMA_BASE_URL` | | 호스트 Ollama (`host.docker.internal`) |
| `EMBEDDING_MODEL` | | `Xenova/multilingual-e5-small` |

---

## 5. Health 체크

```bash
curl http://localhost:3000/api/health
```

| status | 의미 |
|--------|------|
| `ok` | 정상 (chunk > 0) |
| `degraded` | 인덱스 비어 있음 / Ollama·Redis 일부 실패 |
| `unhealthy` | vault 없음 / 벡터 스토어 오류 → 503 |

`checks.redis`: `ok` | `error` | `not_configured`

---

## 6. 검색 품질 게이트

```bash
npm run index:vault
EVAL_HIT3_THRESHOLD=0.8 npm run eval:search
```

- eval 데이터: `data/eval-queries.json` (15문항)
- 목표: **Hit@3 ≥ 80%**
- CI: `.github/workflows/quality-harness.yml`

---

## 7. 운영 체크리스트

- [ ] `AUTH_SECRET` 32자 이상
- [ ] Ollama `llama3` 실행 중
- [ ] Sync Vault 완료 (`chunkCount > 0`)
- [ ] Redis 연결 (`checks.redis: ok`)
- [ ] PgVector 연결 (`checks.postgres: ok`)
- [ ] `npm run eval:search` Hit@3 ≥ 80%

상세 장애 대응: [RUNBOOK.md](./RUNBOOK.md)

---

## 8. 트러블슈팅

| 증상 | 조치 |
|------|------|
| `checks.redis: error` | `docker compose up -d redis` |
| `checks.postgres: error` | `docker compose logs postgres` |
| Ollama 연결 실패 | 호스트에서 `ollama serve` 확인, Mac/Win은 `host.docker.internal` |
| 빈 인덱스 | Admin Sync Vault |
