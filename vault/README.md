# NovaPay 문서 Vault

주식회사 노바페이 사내 지식 베이스 문서 저장소입니다.  
CorpBrain은 이 폴더를 재귀적으로 스캔하여 인덱싱합니다.

## 폴더 구조

```
vault/
├── 전사공통/          # role: general — 전 직원 열람
│   ├── 인사/          # 휴가, 온보딩, 인사 규정
│   ├── 규정/          # 재택, 출장, 보안 정책
│   ├── 엔지니어링/    # 시스템·운영 가이드
│   └── 양식/          # 공통 양식
├── 재무회계/          # role: manager — 팀장급
│   ├── 보고서/        # 분기·연간 실적
│   ├── 인보이스/      # AWS, 협력사 청구서
│   └── 양식/          # 경비 정산 양식
├── 운영/              # role: manager — 운영·장애 대응
├── 법무/              # role: admin — 법무·CSO
│   ├── nda/           # 비밀유지계약서
│   └── 계약/          # 벤더·임대 계약
└── uploads/           # Manager+ 웹 업로드 저장 (증분 인덱싱)
```

## 권한 매핑

| 폴더 | 기본 Role | 대상 |
|------|-----------|------|
| `전사공통/` | general | 전 직원 |
| `재무회계/`, `운영/` | manager | 팀장 이상 |
| `법무/` | admin | 법무·컴플라이언스 |
| `uploads/` | 업로드 시 지정 | manager가 role 선택 |

## 문서 작성 규칙

마크다운 문서는 YAML frontmatter로 메타데이터를 지정합니다.

```yaml
---
role: general
title: 문서 제목
expires: 2027-12-31
---
```

PDF·DOCX는 동일 경로에 `.meta.json` sidecar를 사용합니다.

## 인덱싱

- **Sync Vault** (admin): 이 폴더 전체 재스캔
- **Upload** (manager+): `uploads/`에 저장 후 증분 인덱싱

```bash
# 로컬 Vault 경로 (기본값)
VAULT_PATH=./vault
```

배포 직후 admin 계정으로 **Sync Vault**를 한 번 실행해야 검색이 동작합니다.
