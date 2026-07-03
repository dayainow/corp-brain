# CorpBrain 파일럿 품질 리포트

> **기간**: D-Day ~ D+7 (예: 2026-07-__ ~ 2026-07-__)  
> **작성자**: _______________  
> **관련**: [PILOT_CHECKLIST.md](./PILOT_CHECKLIST.md) · [RUNBOOK.md](./RUNBOOK.md)

---

## 1. 요약

| 항목 | 값 |
|------|-----|
| 파일럿 대상 | __ 명 |
| 활성 사용자 (추정) | __ 명 |
| 총 질문 수 (`chat.query` audit) | __ 건 |

**자동 생성 (D+7 권장)**

```bash
npm run report:pilot-weekly
# → data/reports/pilot-weekly-YYYY-MM-DD.md
# §1 요약·§2 Hit@3·§3 피드백·§4 eval 후보
```

| Go / No-Go 권고 | **Go / No-Go / 조건부 Go** |

---

## 2. 검색 품질 (Hit@3)

```bash
# 인덱스·설정 변경 후 재측정
npm run index:vault   # 또는 PgVector: smoke:compose -- --skip-deploy 후 index
EVAL_HIT3_THRESHOLD=0.8 npm run eval:search
```

| 일자 | Hit@1 | Hit@3 | MRR | 비고 |
|------|-------|-------|-----|------|
| D-1 (오픈 전) | __% | __% | __ | smoke:compose / eval |
| D+3 | __% | __% | __ | |
| D+7 | __% | __% | __ | **목표 ≥ 80%** |

---

## 3. 피드백 (👍/👎)

| rating | 건수 | 비율 |
|--------|------|------|
| up | __ | __% |
| down | __ | __% |

**down 비율 높은 질문 Top 3** (audit `chat.feedback` 기준)

1. __
2. __
3. __

---

## 4. 실패·불만족 질문 Top 5

| # | 사용자 질문 | 기대 문서 | 실제 검색/답변 이슈 | 조치 |
|---|-------------|-----------|---------------------|------|
| 1 | | | | eval 문항 추가 / 동의어 |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

---

## 5. 운영 안정성

| 항목 | D+1 | D+3 | D+7 |
|------|-----|-----|-----|
| `/api/health` status | | | |
| chunkCount | | | |
| 장애 건수 | | | |
| 평균 응답 체감 (설문) | | | |

---

## 6. 회고·다음 액션

### 잘 된 점

-

### 개선 필요

-

### v1.1 / 확대 범위 제안

-

---

## 7. 서명

| 역할 | 이름 | 일자 |
|------|------|------|
| RAG 담당 | | |
| 서비스 오너 | | |

---

*템플릿 v0.2 · 2026-07-03 · `npm run report:pilot-weekly` 연동*
