#!/usr/bin/env bash
# 파일럿 오픈 D-1 사전 점검 (PILOT_CHECKLIST A1~A8)
# Usage:
#   ./scripts/pilot-preflight.sh              # health + 환경 + 안내
#   ./scripts/pilot-preflight.sh --full       # + smoke:compose
#   ./scripts/pilot-preflight.sh --e2e        # + pilot E2E (서버 기동 필요)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE_URL="${BASE_URL:-http://localhost:3000}"
RUN_FULL=false
RUN_E2E=false
PASS=0
FAIL=0
WARN=0

for arg in "$@"; do
  case "$arg" in
    --full) RUN_FULL=true ;;
    --e2e) RUN_E2E=true ;;
    -h|--help)
      sed -n '2,6p' "$0"
      exit 0
      ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

log_pass() { echo "✓ $1"; PASS=$((PASS + 1)); }
log_fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }
log_warn() { echo "⚠ $1"; WARN=$((WARN + 1)); }

load_env() {
  if [[ -f .env.local ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env.local
    set +a
  fi
}

check_auth_secret() {
  load_env
  if [[ -z "${AUTH_SECRET:-}" ]]; then
    log_fail "AUTH_SECRET 미설정 — PILOT_CHECKLIST A1"
    return 1
  fi
  if [[ ${#AUTH_SECRET} -lt 32 ]]; then
    log_warn "AUTH_SECRET 32자 미만 — 운영 전 교체 권장"
  else
    log_pass "AUTH_SECRET 설정됨"
  fi
}

check_health() {
  local body status http_code chunk
  body="$(curl -sf -w "\n%{http_code}" "$BASE_URL/api/health" 2>/dev/null || echo -e "\n000")"
  http_code="$(echo "$body" | tail -n1)"
  body="$(echo "$body" | sed '$d')"

  if [[ "$http_code" == "000" ]]; then
    log_fail "서버 미응답 ($BASE_URL) — npm run dev 또는 deploy:compose"
    return 1
  fi

  status="$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")"
  chunk="$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('chunkCount',0))" 2>/dev/null || echo "0")"

  if [[ "$status" == "ok" && "$chunk" -gt 0 ]]; then
    log_pass "health ok (chunkCount=$chunk)"
  elif [[ "$status" == "degraded" ]]; then
    log_warn "health degraded (chunkCount=$chunk) — RUNBOOK §4 참고"
  else
    log_fail "health $status (HTTP $http_code, chunkCount=$chunk)"
  fi
}

check_ollama() {
  local ollama_url="${OLLAMA_BASE_URL:-http://localhost:11434}"
  if curl -sf "$ollama_url/api/tags" >/dev/null 2>&1; then
    log_pass "Ollama 응답 ($ollama_url)"
  else
    log_warn "Ollama 미응답 — PILOT_CHECKLIST A2 (ollama run llama3)"
  fi
}

print_next_steps() {
  echo ""
  echo "── 다음 단계 (수동) ──"
  echo "  A7  EVAL_HIT3_THRESHOLD=0.8 npm run eval:search"
  echo "  A7b npm run smoke:compose          # Compose 운영 스모크"
  echo "  A8  npm run test:e2e -- e2e/pilot.spec.ts e2e/auth.spec.ts"
  echo "  A9  npm run test:e2e -- e2e/citation-preview.spec.ts"
  echo "  B-Day 가이드: docs/PILOT_OPEN.md"
  echo "  모니터링: npm run health:watch"
  echo "  피드백 리포트: npm run report:feedback"
}

echo "CorpBrain 파일럿 D-1 Preflight"
echo "BASE_URL=$BASE_URL"
echo ""

check_auth_secret || true
check_health || true
check_ollama || true

if [[ "$RUN_FULL" == true ]]; then
  echo ""
  echo "── smoke:compose ──"
  npm run smoke:compose || log_fail "smoke:compose 실패"
fi

if [[ "$RUN_E2E" == true ]]; then
  echo ""
  echo "── pilot E2E ──"
  npm run test:e2e -- e2e/pilot.spec.ts e2e/auth.spec.ts || log_fail "pilot E2E 실패"
fi

print_next_steps

echo ""
echo "결과: PASS=$PASS FAIL=$FAIL WARN=$WARN"
if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
