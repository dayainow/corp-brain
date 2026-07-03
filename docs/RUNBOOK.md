# CorpBrain 운영 Runbook (초안)

> **대상**: NovaPay 플랫폼·RAG 운영 담당자  
> **버전**: v0.2 · 2026-07-03  
> **관련 문서**: [DEPLOY.md](./DEPLOY.md) · [PILOT_CHECKLIST.md](./PILOT_CHECKLIST.md) · [납품 산출물](./deliverables/README.md)

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
# 개발 서버
curl -s http://localhost:3000/api/health | jq .
# Compose 운영
curl -s http://localhost:3100/api/health | jq .
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

### 2.4 파일럿 모니터링 (B-Day ~ D+7)

**D-1 사전 점검**

```bash
npm run pilot:preflight              # AUTH_SECRET · health · Ollama
npm run pilot:preflight -- --full    # + smoke:compose
```

**health 주기 알림** (15분 기본)

```bash
# Compose 운영 모니터링
export BASE_URL=http://localhost:3100
export HEALTH_ALERT_WEBHOOK_URL=https://hooks.slack.com/...  # 또는 AUDIT_WEBHOOK_URL
npm run health:watch
```

| 환경 변수 | 기본값 | 설명 |
|-----------|--------|------|
| `BASE_URL` | `http://localhost:3000` (dev) · Compose는 `3100` | 헬스 폴링 대상 |
| `INTERVAL_SEC` | `900` | 폴링 간격(초) |
| `HEALTH_ALERT_WEBHOOK_URL` | — | Slack Incoming Webhook (우선) |
| `AUDIT_WEBHOOK_URL` | — | 웹훅 미설정 시 대체 |

**피드백 집계**

- Admin UI: `/admin` → 파일럿 피드백 섹션
- CLI: `npm run report:feedback` → [PILOT_QUALITY_REPORT.md](./PILOT_QUALITY_REPORT.md) §3
- CLI: `npm run report:pilot-weekly` → §2·§3·eval 후보 일괄

**임베딩 A/B (개발)**

```bash
npm run index:vault                    # 코퍼스 선행
npm run eval:embedding-ab -- --write-report
```

- 리포트: [EMBEDDING_AB_REPORT.md](./EMBEDDING_AB_REPORT.md)
- ko-sroberta 전용 인덱스: `config/env/local.ko-sroberta.env` 참고 (768d, JSON only)

```bash
npm run test:e2e:rag   # Ollama + index:vault 선행, 실제 /api/chat 스트리밍 검증
```

- Ollama·인덱스 없으면 **자동 skip** (CI 통과 유지)
- 로컬: `ollama run llama3` → `npm run index:vault` → `npm run test:e2e:rag`

상세 오픈 절차: [PILOT_OPEN.md](./PILOT_OPEN.md)

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

- 목표: **Hit@3 ≥ 80%** (`data/eval-queries.json`, 25문항)
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

## 7. 연락·에스컬레이션

> 아래 연락처·온콜 표는 **NovaPay 파일럿 기준 예시**입니다. 실제 납품 시 조직도에 맞게 교체하세요.

### 7.1 담당 조직·연락처 (예시)

| 역할 | 담당 | 이메일 | Slack | 비고 |
|------|------|--------|-------|------|
| **서비스 오너** | 이민호 (플랫폼팀 팀장) | lee.minho@novapay.kr | `@minho.lee` | CorpBrain PoC 총괄 |
| **L1 온콜 (1차)** | 김준호 (플랫폼 엔지니어) | kim.junho@novapay.kr | `@junho.kim` | health·재기동·Sync |
| **L2 RAG·검색** | 박서연 (AI플랫폼) | park.seoyeon@novapay.kr | `@seoyeon.park` | 인덱스·Hit@3·Ollama |
| **L2 인프라** | 최동훈 (DevOps) | choi.donghun@novapay.kr | `@donghun.choi` | Compose·PgVector·Redis |
| **L3 보안** | 정하늘 (정보보안) | jung.haneul@novapay.kr | `@haneul.jung` | 감사·유출·권한 |
| **L3 경영 보고** | NovaPay IT기획실 | it-planning@novapay.kr | `#it-escalation` | 30분+ 장애·외부 공지 |

**공통 채널 (예시)**

| 채널 | 용도 |
|------|------|
| `#corpbrain-alerts` | health degraded·배포 알림 (PagerDuty/웹훅) |
| `#corpbrain-support` | 사용자 문의·품질 피드백 |
| `#platform-oncall` | L1·L2 온콜 협업 |

**긴급 전화 (예시, 업무 시간 외)**

| 구분 | 번호 | 비고 |
|------|------|------|
| 플랫폼 온콜 | 010-1234-5678 | 김준호 (주간 로테이션) |
| DevOps 백업 | 010-2345-6789 | 최동훈 |
| 보안 핫라인 | security-hotline@novapay.kr | L3 전용 |

---

### 7.2 온콜 로테이션 (예시: 2026년 7월)

| 주차 | 기간 | L1 Primary | L1 Backup | L2 (RAG) | L2 (Infra) |
|------|------|------------|-------------|----------|------------|
| W27 | 07/01–07/06 | 김준호 | 이수민 | 박서연 | 최동훈 |
| W28 | 07/07–07/13 | 이수민 | 김준호 | 박서연 | 한지우 |
| W29 | 07/14–07/20 | 김준호 | 이수민 | 오태양 | 최동훈 |
| W30 | 07/21–07/27 | 이수민 | 김준호 | 박서연 | 한지우 |
| W31 | 07/28–08/03 | 한지우 | 김준호 | 오태양 | 최동훈 |

- **Primary**: 1차 응대·health 확인·Runbook §4 조치
- **Backup**: Primary 부재·15분 내 미응답 시 승계
- **L2**: 30분 내 미해결·`unhealthy`·데이터 이슈 시 호출
- 로테이션 갱신: 매월 말 `#platform-oncall`에 차월 표 게시 (예시 담당: 최동훈)

---

### 7.3 에스컬레이션 기준

| 단계 | 담당 | 조건 | 목표 응답 |
|------|------|------|-----------|
| **L1** | 온콜 Primary | `degraded` 15분 지속, 사용자 3건+ 동일 증상 | 15분 이내 ack |
| **L2** | RAG / Infra | `unhealthy`, chunk 대량 소실, 배포 후 전면 장애 | 30분 이내 |
| **L3** | 보안·IT기획 | 감사 이상, 기밀 유출 의심, 1시간+ 미복구 | 1시간 이내 보고 |

**장애 보고에 포함할 정보**

- 발생 시각 (KST)
- `/api/health` JSON 전문
- 최근 배포·vault 변경·Sync 여부
- 영향 범위 (웹 / Slack / admin) 및 추정 사용자 수
- 수행한 조치·결과
- 담당자·다음 업데이트 예정 시각

**장애 종료 후 (예시)**

1. `#corpbrain-alerts`에 resolved 공지
2. `data/audit.log` 해당 구간 보존
3. 48시간 내 간단한 사후 메모 (원인·재발 방지) — Confluence `CorpBrain/Incidents` (예시)

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
| 2026-07-03 | v0.2 | §7 담당자·온콜 로테이션 예시 추가 |
