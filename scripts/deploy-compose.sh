#!/usr/bin/env bash
# CorpBrain Docker Compose 배포 스크립트
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${AUTH_SECRET:-}" ]]; then
  if [[ -f .env.local ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env.local
    set +a
  fi
fi

if [[ -z "${AUTH_SECRET:-}" ]]; then
  echo "ERROR: AUTH_SECRET가 필요합니다 (.env.local 또는 환경 변수)"
  exit 1
fi

echo "==> Docker Compose 인프라 기동 (postgres + redis)"
docker compose up -d postgres redis

echo "==> PostgreSQL 준비 대기"
until docker compose exec -T postgres pg_isready -U corpbrain >/dev/null 2>&1; do
  sleep 2
done

echo "==> PgVector 스키마 초기화"
DATABASE_URL=postgresql://corpbrain:corpbrain@localhost:5432/corpbrain npm run db:init

echo "==> 앱 이미지 빌드 및 기동"
docker compose up -d --build app

echo "==> Health 확인"
for i in {1..20}; do
  if curl -fsS http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "OK: http://localhost:3000/api/health"
    curl -s http://localhost:3000/api/health | head -c 400
    echo ""
    echo ""
    echo "다음 단계:"
    echo "  1. Ollama 실행: ollama run llama3"
    echo "  2. admin 로그인 후 Sync Vault"
    echo "  3. (선택) PgVector 마이그레이션: VECTOR_STORE=pgvector npm run db:migrate"
    exit 0
  fi
  sleep 3
done

echo "WARN: health check 타임아웃 — docker compose logs app 확인"
exit 1
