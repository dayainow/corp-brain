# Embedding A/B 리포트

> 생성: 2026-07-03T04:33:09.339Z
> 코퍼스: `npm run index:vault` 기준 · eval: `data/eval-queries.json`

## 결과

| 모델 | Hit@1 | Hit@3 | MRR | 청크 | 임베딩(ms) |
|------|-------|-------|-----|------|------------|
| **multilingual-e5-small (기본)** | 84.0% | 100.0% | 0.913 | 96 | 2156 |
| ko-sroberta-multitask (한국어) | 84.0% | 100.0% | 0.913 | 96 | 5794 |

**승자**: `Xenova/multilingual-e5-small` (Hit@3 100.0%)

### 적용 방법 (승자 반영 시)

```bash
EMBEDDING_MODEL=Xenova/multilingual-e5-small npm run index:vault
# PgVector 운영 시: embedding 차원 확인 후 schema 마이그레이션 필요
```

## 실패 문항 (모델별)

### multilingual-e5-small (기본)
_없음_

### ko-sroberta-multitask (한국어)
_없음_

