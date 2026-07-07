# CorpBrain 파일럿 오픈 선언 가이드

> **대상**: 서비스 오너 · PM · IT · L1  
> **선행**: [기술 준비 완료](./PILOT_TECH_READY.md) (`npm run pilot:ready` PASS)  
> **버전**: v1.0 · 2026-07-07

---

## 1. 이 문서의 역할

| 구분 | 문서 | 담당 |
|------|------|------|
| **기술 준비** | [PILOT_TECH_READY.md](./PILOT_TECH_READY.md) · `pilot:ready` | 플랫폼·RAG (자동) |
| **오픈 실행** | [PILOT_OPEN.md](./PILOT_OPEN.md) B-Day | PM·IT·L1 |
| **오픈 선언** | **이 문서** §2~4 | 서비스 오너 |
| **오픈 후** | [PILOT_CHECKLIST.md](./PILOT_CHECKLIST.md) C항목 | L1·RAG·PM |

기술 준비가 끝나면, **이 가이드대로 사람·프로세스만 마무리**하면 파일럿 오픈을 선언할 수 있습니다.

---

## 2. 오픈 선언 전 체크 (5분)

### 2.1 자동 확인 (이미 통과했는지 재확인)

```bash
npm run pilot:closeout-loop -- --quick   # health + harness + A10 + Slack × 3회
# 또는 전체
npm run pilot:closeout-loop
```

| 항목 | 명령 | 기준 |
|------|------|------|
| 기술 게이트 | `npm run pilot:ready` | PASS (FAIL=0) |
| A10 웹훅 | `npm run pilot:a10-setup -- --verify-only` | PASS |
| B4 Slack | `npm run pilot:slack-smoke` | PASS 3/3 |
| B3 모니터링 | `npm run pilot:bday -- --watch` | `data/health-watch.pid` 존재 |

### 2.2 수동 확인 (담당자 서명용)

- [ ] **B1** IT: 파일럿 대상자 계정·역할 배포 완료
- [ ] **B2** PM: `#corpbrain-pilot` 오픈 공지 게시
- [ ] **B5** 서비스 오너: `#corpbrain-alerts` 에스컬레이션 경로 고정
- [ ] **A10** 플랫폼: RUNBOOK §7 온콜 연락망 팀 공유
- [ ] **보안**: PoC 비밀번호·웹훅 URL 유출 시 교체 계획 확인

---

## 3. 오픈 선언 실행 순서 (D-Day)

### Step 1 — IT: 계정 배포 (B1)

```bash
npm run pilot:bday -- --step b1
```

- 시드 계정 표를 기준으로 파일럿 50명 계정 생성·역할 부여
- Google SSO 사용 시 [DEPLOY.md](./DEPLOY.md) 도메인 제한 확인
- **완료 기준**: 대표 3역할(admin/manager/general) 로그인 1회씩 성공

### Step 2 — PM: 사용자 공지 (B2)

```bash
npm run pilot:bday -- --step b2
```

- 출력 블록을 **`#corpbrain-pilot`** 에 붙여넣기
- (선택) 동일 내용 이메일 — 제목: `[파일럿] CorpBrain 사내 지식 검색 챗봇 오픈 안내`
- **완료 기준**: 접속 URL · 가이드 · 피드백(👍/👎) 안내 포함

### Step 3 — L1: 모니터링 가동 (B3)

```bash
export BASE_URL=http://localhost:3100   # 운영 호스트로 교체
npm run pilot:bday -- --watch
# 확인: ps -p $(cat data/health-watch.pid)
# 로그: tail -f data/health-watch.log
```

- **완료 기준**: health `ok` 주기 로그 + `#corpbrain-alerts` 웹훅 연동 확인됨

### Step 4 — 서비스 오너: 장애 대응 공지 (B5)

`#corpbrain-alerts` 또는 `#corpbrain-pilot`에 **고정(pin)**:

```
[CorpBrain 파일럿] 장애 대응 경로

1차 L1: 김준호 @junho.kim (health·재기동·Sync)
2차 RAG: 박서연 @seoyeon.park (인덱스·Hit@3·Ollama)
2차 Infra: 최동훈 @donghun.choi (Compose·PgVector·Redis)
서비스 오너: 이민호 @minho.lee

헬스: curl <BASE_URL>/api/health
상세: docs/RUNBOOK.md §4 · §7
```

### Step 5 — Go / No-Go 회의 (D)

[PILOT_CHECKLIST.md §D](./PILOT_CHECKLIST.md) 기준:

| | Go | No-Go |
|---|-----|-------|
| health | `ok`, chunkCount > 0 | `unhealthy` 미해결 |
| 검색 | Hit@3 ≥ 80% | 빈 인덱스 |
| 시나리오 | 핵심 3건 통과 (A8·A9) | Ollama 미연결 |
| 운영 | 온콜·웹훅 가동 | 보안 이슈 |

**Go 시 서명** (체크리스트 §D 표에 기입):

| 역할 | 이름 | 일자 |
|------|------|------|
| 서비스 오너 | | |
| 플랫폼 L1 | | |
| RAG 담당 | | |

### Step 6 — 오픈 선언 문구 (예시)

`#corpbrain-pilot` 게시:

```
CorpBrain 파일럿을 공식 오픈합니다. (Go 결정 · 2026-07-__)

접속: <BASE_URL>
문의: #corpbrain-support
장애: #corpbrain-alerts + L1 온콜

피드백은 답변 아래 👍/👎 부탁드립니다.
```

---

## 4. 오픈 직후 (D+0 ~ D+7)

| 일정 | 담당 | 작업 |
|------|------|------|
| D+0 | L1 | health 로그·`#corpbrain-alerts` 이상 없음 확인 |
| D+1~7 | RAG | `npm run report:feedback` (필요 시 일일) |
| D+7 | PM | `npm run report:pilot-weekly` → 회고 |

상세: [PILOT_OPEN.md §3](./PILOT_OPEN.md)

---

## 5. 관련 명령

| 명령 | 용도 |
|------|------|
| `npm run pilot:ready` | 기술 준비 일괄 게이트 |
| `npm run pilot:closeout-loop` | 마무리 3회 검증 루프 |
| `npm run pilot:bday -- --all` | A10 + B1~B4 안내·스모크 |
| `npm run pilot:a10-setup -- --verify-only` | 웹훅 재검증 |
| `npm run report:pilot-weekly` | D+7 주간 리포트 |

---

*기술 준비 상세: [PILOT_TECH_READY.md](./PILOT_TECH_READY.md) · 운영: [RUNBOOK.md](./RUNBOOK.md)*
