# 🧠 CorpBrain

엔터프라이즈급 권한 관리(RBAC)를 지원하는 **로컬 RAG(Retrieval-Augmented Generation) 기반 사내 문서 챗봇 시스템**입니다.

## ✨ 주요 기능

- **하이브리드 검색 (Hybrid Search)**: 벡터 유사도 기반의 의미론적 검색(Semantic Search)과 키워드(BM25) 검색을 융합하여 RRF 알고리즘으로 정확도 극대화
- **시맨틱 청킹 (Semantic Chunking)**: 단순 글자 수 단위가 아닌 마크다운 헤더(`#`, `##`) 단위로 텍스트를 청킹하여 문맥 보존
- **권한 관리 (RBAC - Role-Based Access Control)**: 
  - 각 문서의 Frontmatter(`role: admin | manager | general`)를 기반으로 열람 권한 차등 적용
  - 사용자의 권한 등급을 파악하여 **허가되지 않은 문서는 검색 및 참조 단계에서 원천 차단 (Pre-filtering)**
- **100% 로컬 프라이버시 유지**: `Ollama` 및 로컬 임베딩 모델(Transformers.js)을 사용하여 사내 기밀 문서를 외부 클라우드로 전송하지 않음
- **세션 기억 기능**: 브라우저 스토리지를 활용한 대화 내용 저장
- **출처 명시**: AI 답변 시 참고한 사내 문서의 정확한 파일명(출처 뱃지) 표기

## 🛠️ 기술 스택

- **Frontend**: Next.js 16 (App Router), React 19, TailwindCSS 4, Lucide-React
- **Backend**: Next.js API Routes, Vercel AI SDK (v6), `@ai-sdk/openai`
- **LLM Engine**: Ollama (로컬 오픈소스 모델 구동)
- **Embedding**: `@xenova/transformers` (In-browser/Node.js 로컬 임베딩)

## 🚀 실행 방법

### 1. 사전 준비 (Prerequisites)
- [Node.js](https://nodejs.org/) (v18 이상 권장)
- [Ollama](https://ollama.com/) 설치 및 실행
  ```bash
  # Llama 3 모델 다운로드 및 실행
  ollama run llama3
  ```

### 2. 설치 및 실행 (Installation)
```bash
# 1. 레포지토리 클론
git clone https://github.com/dayainow/corp-brain.git
cd corp-brain

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행
npm run dev
```

### 3. 테스트 방법
1. 브라우저에서 `http://localhost:3000`에 접속합니다.
2. 우측 상단의 `Sync Vault` 버튼을 눌러 `/sample-docs` 폴더 내의 더미 마크다운 문서들을 인덱싱합니다.
3. 문서의 `role` 속성에 따라 `General`, `Manager`, `Admin` 권한을 선택하며 RAG가 권한에 맞게 답변하는지 테스트할 수 있습니다.

## 📝 구조

- `/src/app`: Next.js 앱 라우터 페이지 및 API 연동
- `/src/lib/vector-store`: 하이브리드 검색 및 In-memory 벡터 스토리지 구현체
- `/src/lib/indexer`: 마크다운 문서를 읽어 Semantic Chunking 및 임베딩을 생성하는 모듈
- `/src/lib/embeddings`: Transformers.js 기반 텍스트 벡터 변환 로직
- `/sample-docs`: 각종 사내 규정, 인보이스, 계약서, 기안서 등의 마크다운 샘플 데이터 세트
