# Cross-encoder A/B 리포트

> 생성: 2026-07-03T08:33:53.118Z
> 선행: `npm run index:vault` · eval: `data/eval-queries.json`

## 결과

| 변형 | Hit@1 | Hit@3 | MRR |
|------|-------|-------|-----|
| **Heuristic only (CE off)** | 84.0% | 100.0% | 0.913 |
| Cross-encoder (Xenova/ms-marco-MiniLM-L-6-v2) | 96.0% | 96.0% | 0.970 |

**승자**: Heuristic only (CE off)

### 적용 (승자가 CE on일 때)

```bash
CROSS_ENCODER_MODEL=Xenova/ms-marco-MiniLM-L-6-v2 npm run dev:quality
# 또는 .env.local / compose.host.env 에 설정
```

## Hit@3 미스 (변형별)

### Heuristic only (CE off)
_없음_

### Cross-encoder (Xenova/ms-marco-MiniLM-L-6-v2)
- "반차는 몇 시간 쓸 수 있어?" — 기대: 연차휴가규정.md
