# CorpBrain 파일럿 오픈 가이드 (B-Day)

> **대상**: PM · IT · L1 운영  
> **선행**: [PILOT_CHECKLIST.md](./PILOT_CHECKLIST.md) A항목 완료  
> **버전**: v0.1 · 2026-07-03

---

## 1. D-1 사전 점검 (자동화)

```bash
# 기본: AUTH_SECRET · health · Ollama
npm run pilot:preflight

# Compose 운영 스모크 포함
npm run pilot:preflight -- --full

# B-Day 전 전체 자동 점검 (Compose + A8 E2E + A9 RAG)
npm run pilot:ready

# E2E만 (로컬/스테이징 서버 기동 후)
npm run pilot:preflight -- --e2e
```

| 스크립트 | 대응 체크리스트 |
|----------|----------------|
| `pilot:preflight` | A1, A6, A2(경고) |
| `pilot:preflight --full` | + A7b |
| `pilot:preflight --e2e` | + A8 |
| `pilot:ready` | --full + A8 + A9 (RAG, Ollama 필요) |
| `EVAL_HIT3_THRESHOLD=0.8 npm run eval:search` | A7 |

---

## 2. B-Day 오픈 순서

### 2.1 계정·권한 배포 (B1)

| 역할 | 용도 | 예시 |
|------|------|------|
| `admin` | Sync Vault · Admin 대시보드 | lee.minho@novapay.kr |
| `manager` | 팀 문서 + 일반 | 팀장 시드 |
| `general` | 파일럿 50명 | kim.junho@novapay.kr |

- Google SSO(`@novapay.kr`) 사용 시 [DEPLOY.md](./DEPLOY.md) 인증 설정 확인
- PoC 비밀번호는 **파일럿 종료 후 반드시 변경**

### 2.2 사용자 안내 (B2)

**Slack `#corpbrain-pilot` 예시**

```
안녕하세요, CorpBrain 파일럿이 오늘부터 시작됩니다.

🔗 접속: https://<호스트>/
📖 사용법: 로그인 후 상단 "가이드" 또는 /guide
💡 예시 질문: "연차 신청 방법", "경비 정산 규정"
📂 왼쪽 문서 트리: 보기(원문) / 질문(채팅) 버튼으로 탐색
💬 답변 아래 "이어서 물어보기" 칩으로 후속 질문 가능

답변 아래 👍/👎 로 피드백 부탁드립니다.
문제·개선 제안: #corpbrain-alerts 멘션 또는 PM에게 DM
```

**이메일 제목**: `[파일럿] CorpBrain 사내 지식 검색 챗봇 오픈 안내`

### 2.3 모니터링 시작 (B3)

터미널 또는 systemd/cron에서 백그라운드 실행:

```bash
export BASE_URL=https://corpbrain.internal
export HEALTH_ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
export INTERVAL_SEC=900   # 15분

npm run health:watch
```

- `status=ok` 복구 시에도 알림 (recovered)
- 상세: [RUNBOOK.md §2.4](./RUNBOOK.md)

### 2.4 장애 대응 공지 (B5)

오픈 당일 `#corpbrain-alerts`에 고정:

```
장애 시: L1 @___ → 플랫폼 @___ → RUNBOOK docs/RUNBOOK.md §4
헬스: curl <BASE_URL>/api/health
```

---

## 3. 오픈 후 피드백 루프 (D+1 ~ D+7)

### 3.1 일일 확인

| 채널 | 내용 |
|------|------|
| `/admin` | 피드백 👍/👎 · down Top 질문 |
| CLI | `npm run report:feedback` → [PILOT_QUALITY_REPORT.md](./PILOT_QUALITY_REPORT.md) §3 붙여넣기 |
| `data/audit.log` | `chat.feedback` 이상 패턴 |

### 3.2 down 질문 → 품질 개선

1. Admin **👎 Top 질문** 또는 `report:feedback` 출력 확인
2. `data/eval-queries.json`에 후보 문항 추가 — **Admin `/admin` → eval 추가** 또는 `npm run report:pilot-weekly` JSON 블록
3. 동의어·문서 보완 후 `npm run index:vault`
4. `EVAL_HIT3_THRESHOLD=0.8 npm run eval:search` 재측정

### 3.3 주간 리포트

[PILOT_QUALITY_REPORT.md](./PILOT_QUALITY_REPORT.md) 템플릿 작성:

```bash
npm run report:feedback          # §3 피드백만
npm run report:pilot-weekly      # §2 Hit@3 + §3 피드백 + eval 후보 JSON
EVAL_HIT3_THRESHOLD=0.8 npm run eval:search   # Hit@3만
```

---

## 4. Go / No-Go 기준

[PILOT_CHECKLIST.md §D](./PILOT_CHECKLIST.md) 와 동일:

- **Go**: health `ok` · Hit@3 ≥ 80% · 핵심 시나리오 3건 · 온콜 가동
- **No-Go**: `unhealthy` 미해결 · 빈 인덱스 · Ollama 미연결

---

## 5. 관련 명령 요약

| 명령 | 용도 |
|------|------|
| `npm run pilot:preflight` | D-1 사전 점검 |
| `npm run health:watch` | 15분 health 알림 |
| `npm run report:feedback` | 피드백 마크다운 리포트 |
| `npm run smoke:compose` | Compose 운영 스모크 |
| `GET /api/admin/feedback` | Admin API (admin 권한) |
| `npm run eval:embedding-ab` | e5 vs ko-sroberta Hit@3 A/B (개발 검증) |

---

*문서 버전 v0.1 · 운영 상세는 [RUNBOOK.md](./RUNBOOK.md)*
