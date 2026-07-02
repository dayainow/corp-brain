---
role: general
title: CorpBrain 운영 가이드
---
# CorpBrain 운영 가이드

주식회사 노바페이 사내 지식 검색 시스템(CorpBrain)의 일상 운영·문서 관리 절차입니다.

## 시스템 개요

CorpBrain은 `vault/` 폴더에 저장된 사내 문서를 벡터 인덱싱한 뒤, 직원 권한(Role)에 맞게 RAG 답변을 제공합니다.

| Role | 열람 범위 | 주요 권한 |
|------|-----------|-----------|
| general | 전사공통 문서 | 채팅 질의 |
| manager | general + 재무·운영 | 문서 업로드 |
| admin | 전체 | Sync Vault, Admin 대시보드 |

## 문서 Vault 구조

```
vault/
├── 전사공통/    # 인사·규정·엔지니어링·양식 (general)
├── 재무회계/    # 보고서·인보이스 (manager)
├── 운영/        # 장애·회의록 (manager)
├── 법무/        # NDA·계약 (admin)
└── uploads/     # 웹 업로드 저장소
```

부서별 하위 폴더에 마크다운·PDF·DOCX를 배치합니다. 파일명은 한글·영문 모두 가능하나, 검색 품질을 위해 제목형 파일명을 권장합니다.

## 문서 작성 규칙

마크다운은 YAML frontmatter로 권한·만료일을 지정합니다.

```yaml
---
role: general
title: 연차 휴가 규정
expires: 2027-12-31
---
```

- `role`: `general` | `manager` | `admin`
- `expires`: 만료일 이후 검색·인용에서 자동 제외
- PDF·DOCX는 동일 경로에 `.meta.json` sidecar 사용

## 인덱싱 절차

| 작업 | 담당 | 방법 |
|------|------|------|
| 전체 재인덱싱 | admin | 채팅 화면 **Sync Vault** |
| 단건 추가 | manager+ | **문서 업로드** → `uploads/` 저장 후 증분 인덱싱 |

Vault 파일을 Git·SFTP·공유 드라이브로 직접 추가한 경우에도 admin이 **Sync Vault**를 실행해야 검색에 반영됩니다.

## 운영 체크리스트

### 최초 배포

1. Ollama 및 LLM 모델(`llama3`) 기동 확인
2. `.env`에 `VAULT_PATH=./vault`, `AUTH_SECRET` 설정
3. admin 계정 로그인 후 **Sync Vault** 실행
4. general·manager·admin 계정으로 권한별 검색 테스트

### 정기 운영

- 규정·계약 갱신 시 frontmatter `expires` 및 본문 동시 수정
- 분기별 Admin 대시보드에서 청크 수·감사 로그 점검
- `data/audit.log` 또는 SIEM Webhook으로 질의 이력 모니터링

## 보안 유의사항

- 챗봇 답변에 민감 개인정보(주민번호, 계좌 전체 등)를 포함하지 않습니다.
- 법무·NDA 문서는 `admin` Role로 제한되어 있습니다.
- 외부 LLM API 대신 **사내 Ollama**로만 추론하여 데이터 유출 위험을 최소화합니다.

## 문의

- 시스템 장애: IT인프라팀 Slack `#it-helpdesk`
- 문서 권한·분류: 각 부서 문서 관리자 → 법무·컴플라이언스팀 검토
