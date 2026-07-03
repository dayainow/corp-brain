#!/usr/bin/env bash
# 파일럿 오픈 D-1 사전 점검 (PILOT_CHECKLIST A1~A8)
# Usage:
#   ./scripts/pilot-preflight.sh              # health + 환경 + 안내
#   ./scripts/pilot-preflight.sh --full       # + smoke:compose
#   ./scripts/pilot-preflight.sh --e2e        # + pilot E2E (서버 기동 필요)
#   ./scripts/pilot-preflight.sh --ready      # --full + --e2e + test:e2e:rag
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RUN_FULL=false
RUN_E2E=false
RUN_READY=false
PASS=0
FAIL=0
WARN=0

for arg in "$@"; do
  case "$arg" in
    --full) RUN_FULL=true ;;
    --e2e) RUN_E2E=true ;;
    --ready) RUN_FULL=true; RUN_E2E=true; RUN_READY=true ;;
    -h|--help)
      sed -n '2,6p' "$0"
      exit 0
      ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

if [[ "$RUN_FULL" == true ]]; then
  if [[ -f config/env/compose.host.env ]]; then
    set -a
    # shellcheck disable=SC1091
    source config/env/compose.host.env
    set +a
  fi
  BASE_URL="${BASE_URL:-${AUTH_URL:-http://localhost:3100}}"
else
  BASE_URL="${BASE_URL:-http://localhost:3000}"
fi

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
    if [[ "$RUN_E2E" == true ]]; then
      log_warn "서버 미응답 ($BASE_URL) — E2E는 Playwright가 :3001에서 자체 기동"
    else
      log_fail "서버 미응답 ($BASE_URL) — npm run dev 또는 deploy:compose"
    fi
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

check_search_quality() {
  if [[ ! -f src/data/vectors.json ]]; then
    log_warn "vectors.json 없음 — npm run quality:gate"
    return 0
  fi
  echo ""
  echo "── harness:quality (Hit@3) ──"
  if EVAL_HIT3_THRESHOLD="${EVAL_HIT3_THRESHOLD:-0.8}" npm run harness:quality; then
    log_pass "검색 품질 harness (Hit@3 ≥ ${EVAL_HIT3_THRESHOLD:-0.8})"
  else
    log_fail "harness:quality / Hit@3 미달"
  fi
}

print_next_steps() {
  echo ""
  echo "── 다음 단계 (수동) ──"
  echo "  A7  npm run harness:quality  (또는 npm run quality:gate)"
  echo "  A7b npm run smoke:compose          # Compose 운영 스모크"
  echo "  A8  npm run test:e2e -- e2e/pilot.spec.ts e2e/auth.spec.ts"
  echo "  A9  npm run test:e2e:rag              # Ollama RAG (ollama + index:vault)"
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
check_search_quality || true

if [[ "$RUN_FULL" == true ]]; then
  echo ""
  echo "── smoke:compose ──"
  SMOKE_EXTRA=()
  if [[ "$RUN_READY" == true && -f config/env/compose.host.env ]]; then
    set -a
    # shellcheck disable=SC1091
    source config/env/compose.host.env
    set +a
    ready_url="${AUTH_URL:-http://localhost:3100}"
    ready_health="$(curl -sf "$ready_url/api/health" 2>/dev/null || echo "")"
    ready_status="$(echo "$ready_health" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")"
    if [[ "$ready_status" == "ok" ]]; then
      SMOKE_EXTRA=(--skip-deploy)
      echo "Compose health ok ($ready_url) — 재배포 생략 (--skip-deploy)"
    fi
  fi
  npm run smoke:compose -- "${SMOKE_EXTRA[@]}" || log_fail "smoke:compose 실패"
fi

if [[ "$RUN_E2E" == true ]]; then
  echo ""
  echo "── pilot E2E ──"
  # Playwright webServer 포트 충돌 방지
  lsof -ti :3001 2>/dev/null | xargs kill -9 2>/dev/null || true
  sleep 1
  npm run test:e2e -- e2e/pilot.spec.ts e2e/auth.spec.ts || log_fail "pilot E2E 실패"
fi

if [[ "$RUN_READY" == true ]]; then
  echo ""
  echo "── RAG E2E (A9) ──"
  lsof -ti :3001 2>/dev/null | xargs kill -9 2>/dev/null || true
  sleep 1
  if npm run test:e2e:rag; then
    log_pass "RAG E2E (Ollama)"
  else
    log_warn "RAG E2E 실패 또는 skip — Ollama·index:vault 확인"
  fi
fi

print_next_steps

echo ""
echo "결과: PASS=$PASS FAIL=$FAIL WARN=$WARN"
if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
