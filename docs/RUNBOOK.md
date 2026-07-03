# CorpBrain 운영 Runbook (초안)

> **대상**: NovaPay 플랫폼·RAG 운영 담당자  
> **버전**: v0.1 · 2026-07-03  
> **관련 문서**: [DEPLOY.md](./DEPLOY.md) · [납품 산출물](./deliverables/README.md)

---

## 1. 서비스 개요

| 항목 | 내용 |
|------|------|
| **서비스명** | CorpBrain — 사내 RAG 챗봇 |
| **핵심 URL** | `/` (채팅), `/admin` (관리), `/api/health` (헬스) |
| **의존성** | Next.js 앱 · Ollama · Vault · 벡터 DB · (운영) Redis · PostgreSQL/PgVector |

### 구성 요소

| 컴포넌트 | 역할 | 장애 시 영향 |
|----------|------|----------------|
| **app** | 웹·API | 전체 서비스 불가 |
| **vault/** | 원본 문서 | 검색·답변 품질 저하 |
| **벡터 인덱스** | JSON 또는 PgVector | RAG 불가 (`chunkCount=0`) |
| **Ollama** | LLM 답변 생성 | 채팅·Slack 응답 실패 |
| **Redis** | Rate limit (다중 인스턴스) | 단일 인스턴스는 동작, 운영 정책 미충족 |
| **PostgreSQL** | PgVector (운영) | 벡터 검색 불가 |

---

## 2. 일상 점검 (Daily)

### 2.1 헬스체크

```bash
curl -s http://localhost:3000/api/health | jq .
```

| `status` | HTTP | 의미 | 조치 |
|----------|------|------|------|
| `ok` | 200 | 정상 (`chunkCount > 0`, 필수 체크 통과) | 없음 |
| `degraded` | 200 | 부분 장애 (빈 인덱스, Ollama/Redis/PG 등) | §4 해당 시나리오 |
| `unhealthy` | 503 | 치명적 (vault 없음, 벡터 스토어 오류) | §4.1·§4.2 즉시 |

### 2.2 체크리스트 (5분)

- [ ] `status` = `ok` (또는 허용된 `degraded` 사유 문서화)
- [ ] `chunkCount` > 0
- [ ] `checks.ollama` = `ok`
- [ ] 운영 환경: `checks.redis` = `ok`, `checks.postgres` = `ok`
- [ ] 샘플 질문 1건 응답·출처 뱃지 확인

### 2.3 로그 위치

| 로그 | 경로·명령 |
|------|-----------|
| 앱 (Compose) | `docker compose logs -f app --tail=200` |
| PostgreSQL | `docker compose logs -f postgres --tail=100` |
| Redis | `docker compose logs -f redis --tail=100` |
| 감사 로그 | `data/audit.log` (또는 `AUDIT_LOG_PATH`) |
| Ollama (호스트) | `ollama ps`, 시스템 서비스 로그 |

---

## 3. 정기 작업

### 3.1 Vault 동기화 (문서 변경 후)

**증분 Sync** (기본, Admin UI):

1. `lee.minho@novapay.kr` 등 **admin** 로그인
2. 상단 **Sync Vault** 클릭
3. `/api/health` → `chunkCount` 증가·변경 확인

**CLI (전체/증분)**:

```bash
npm run index:vault
# PgVector 운영
VECTOR_STORE=pgvector DATABASE_URL=postgresql://... npm run index:vault
```

- manifest: `data/index-manifest.json` (mtime·hash 기반 증분)
- vault에 문서 추가·수정·삭제 후 반드시 Sync

### 3.2 검색 품질 게이트 (배포 전·주 1회 권장)

```bash
npm run index:vault
EVAL_HIT3_THRESHOLD=0.8 npm run eval:search
```

- 목표: **Hit@3 ≥ 80%** (`data/eval-queries.json`, 15문항)
- 실패 시: vault 문서·동의어·Cross-encoder 설정 검토 → [DEPLOY.md §6](./DEPLOY.md)

### 3.3 백업

| 대상 | 주기 | 방법 |
|------|------|------|
| `vault/` | 일 1회 | 스토리지 스냅샷·rsync |
| PostgreSQL | 일 1회 | `pg_dump` (PgVector 운영 시) |
| `data/audit.log` | 주 1회 | 로그 수집·SIEM (`AUDIT_WEBHOOK_URL`) |
| `vectors.json` | 개발만 | Git 제외, 필요 시 vault 재인덱싱으로 복구 |

---

## 4. 장애 대응

### 4.1 `unhealthy` — vault missing / vectorStore error

**증상**: HTTP 503, `checks.vault` = `missing` 또는 `checks.vectorStore` = `error`

1. `VAULT_PATH` 환경 변수·볼륨 마운트 확인
2. vault 디렉터리 존재·읽기 권한 확인
3. PgVector: `DATABASE_URL`, `docker compose ps postgres`
4. 복구 후 **Sync Vault** → health `ok` 확인

### 4.2 `degraded` — index empty (`chunkCount: 0`)

**증상**: `checks.index` = `empty`, `indexHint` 표시

1. admin 로그인 → **Sync Vault**
2. CLI: `npm run index:vault`
3. vault 파일 수·`shouldSkipVaultFile`(README.md 제외) 확인
4. 인덱싱 로그에 파서 오류 없는지 확인

### 4.3 Ollama 연결 실패

**증상**: `checks.ollama` = `error`, 채팅 무응답·타임아웃

```bash
# 호스트
ollama serve          # 미실행 시
ollama run llama3     # 모델 메모리 로드
curl http://localhost:11434/api/tags
```

- Docker 앱: `OLLAMA_BASE_URL` — Mac/Win `http://host.docker.internal:11434/v1`
- 모델명: `OLLAMA_MODEL`과 설치 모델 일치 (`ollama list`)

### 4.4 Redis 연결 실패

**증상**: `checks.redis` = `error`

```bash
docker compose up -d redis
docker compose exec redis redis-cli ping   # PONG
```

- `REDIS_URL` 확인 (Compose: `redis://redis:6379`)
- Rate limit만 영향 — 단일 인스턴스 개발은 `not_configured` 허용

### 4.5 PostgreSQL / PgVector 오류

**증상**: `checks.postgres` = `error`

```bash
docker compose up -d postgres
docker compose exec postgres pg_isready -U corpbrain
npm run db:init
```

- 스키마 초기화 후 vault 재인덱싱 또는 `npm run db:migrate`

### 4.6 채팅은 되나 검색 품질 저하

1. `npm run eval:search` — Hit@3 확인
2. Cross-encoder·임베딩 모델 변경 여부 (`.env` / 재인덱싱 필요)
3. 만료 문서: frontmatter `expires` — 검색 제외 정상 동작
4. RBAC: 사용자 role에 맞는 문서만 검색되는지 확인

### 4.7 Slack `/corpbrain` 무응답

1. `SLACK_SIGNING_SECRET`·앱 URL 설정
2. `SLACK_USER_MAP` — Slack User ID → `@novapay.kr` 이메일
3. Ollama·인덱스 health 동일 적용

---

## 5. 배포·재기동

### 5.1 Compose 전체 배포

```bash
export AUTH_SECRET=...   # 또는 .env.local
./scripts/deploy-compose.sh
ollama run llama3        # 별도 터미널
# Admin → Sync Vault
```

상세: [DEPLOY.md](./DEPLOY.md)

### 5.2 롤링 재기동 (무중단 목표 시)

1. 신규 이미지 빌드·기동 (인스턴스 N+1)
2. `/api/health` ok 확인
3. 트래픽 전환 후 구 인스턴스 종료
4. Redis·PgVector는 공유 스토어 유지

### 5.3 롤백

1. 이전 Docker 이미지 태그로 `app` 재배포
2. DB 스키마 변경이 없었다면 vault·PgVector 데이터 유지
3. env 변경 시 이전 `.env` 복원 후 재기동
4. health·eval:search로 검증

---

## 6. 보안·감사

| 이벤트 | 기록 위치 | 담당 조치 |
|--------|-----------|-----------|
| 로그인·채팅·업로드·Sync | `audit.log` | SIEM webhook 모니터링 |
| Rate limit 초과 | API 429 | IP·사용자 패턴 검토 |
| 권한 오류 | API 403 | RBAC·문서 `role` frontmatter |

- `AUTH_SECRET` 유출 시: 즉시 교체 → 전 세션 무효화
- admin 시드 비밀번호: 파일럿 후 운영 정책에 맞게 변경

---

## 7. 연락·에스컬레이션 (템플릿)

| 단계 | 담당 | 조건 |
|------|------|------|
| L1 | 온콜 엔지니어 | health degraded 15분 지속 |
| L2 | 플랫폼·RAG | unhealthy, 데이터 손실 의심 |
| L3 | 보안·인프라 | 감사 이상·유출 의심 |

**장애 보고에 포함할 정보**

- 발생 시각 (UTC+9)
- `/api/health` JSON 전문
- 최근 배포·vault 변경·Sync 여부
- 영향 범위 (웹 / Slack / admin)
- 수행한 조치·결과

---

## 8. 로컬 개발 참고

| 모드 | 명령 | 용도 |
|------|------|------|
| Fast | `npm run dev:fast` | Cross-encoder OFF, 일상 개발 |
| Quality | `npm run dev:quality` | Hit@3·Cross-encoder 검증 |

프리셋: `config/env/local.fast.env`, `config/env/local.quality.env`

---

## 9. 변경 이력

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2026-07-03 | v0.1 | 초안 작성 (health·Sync·장애 시나리오·백업) |
