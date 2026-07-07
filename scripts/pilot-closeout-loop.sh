#!/usr/bin/env bash
# 파일럿 기술 준비·오픈 선언 3회 검증 루프
# Usage:
#   ./scripts/pilot-closeout-loop.sh
#   ./scripts/pilot-closeout-loop.sh --quick   # harness + smoke만 (E2E 생략)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

QUICK=false
for arg in "$@"; do
  case "$arg" in
    --quick) QUICK=true ;;
    -h|--help)
      sed -n '2,5p' "$0"
      exit 0
      ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

if [[ -f config/env/compose.host.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source config/env/compose.host.env
  set +a
fi
BASE_URL="${BASE_URL:-http://localhost:3100}"

PASS=0
FAIL=0
WARN=0
LOOP_RESULTS=()

log_pass() { echo "✓ $1"; PASS=$((PASS + 1)); }
log_fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }
log_warn() { echo "⚠ $1"; WARN=$((WARN + 1)); }

run_loop() {
  local n="$1"
  local loop_pass=0
  local loop_fail=0
  echo ""
  echo "══════════════════════════════════════"
  echo " 루프 $n / 3"
  echo "══════════════════════════════════════"

  echo ""
  echo "── health ──"
  body="$(curl -sf "$BASE_URL/api/health" 2>/dev/null || echo "")"
  if [[ -n "$body" ]] && echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('status')=='ok' and d.get('chunkCount',0)>0 else 1)" 2>/dev/null; then
    log_pass "health ok"
    loop_pass=$((loop_pass + 1))
  else
    log_fail "health 미응답 또는 degraded"
    loop_fail=$((loop_fail + 1))
  fi

  echo ""
  echo "── harness:quality ──"
  if npm run harness:quality >/tmp/pilot-closeout-harness-$n.log 2>&1; then
    log_pass "harness Hit@3"
    loop_pass=$((loop_pass + 1))
  else
    log_fail "harness 실패 (로그: /tmp/pilot-closeout-harness-$n.log)"
    loop_fail=$((loop_fail + 1))
  fi

  echo ""
  echo "── A10 웹훅 ──"
  if npm run pilot:a10-smoke >/tmp/pilot-closeout-a10-$n.log 2>&1; then
    log_pass "A10 웹훅"
    loop_pass=$((loop_pass + 1))
  else
    log_warn "A10 스킵/실패 — HEALTH_ALERT_WEBHOOK_URL 확인"
  fi

  echo ""
  echo "── B4 Slack ──"
  if npm run pilot:slack-smoke >/tmp/pilot-closeout-slack-$n.log 2>&1; then
    log_pass "Slack 스모크"
    loop_pass=$((loop_pass + 1))
  else
    log_fail "Slack 스모크 실패"
    loop_fail=$((loop_fail + 1))
  fi

  if [[ "$QUICK" != true ]]; then
    echo ""
    echo "── 단위 테스트 ──"
    if npm test >/tmp/pilot-closeout-test-$n.log 2>&1; then
      log_pass "vitest"
      loop_pass=$((loop_pass + 1))
    else
      log_fail "vitest 실패"
      loop_fail=$((loop_fail + 1))
    fi
  fi

  LOOP_RESULTS+=("루프$n: PASS=$loop_pass FAIL=$loop_fail")
}

echo "CorpBrain 파일럿 마무리 검증 (3회 루프)"
echo "BASE_URL=$BASE_URL QUICK=$QUICK"

for i in 1 2 3; do
  run_loop "$i"
done

echo ""
echo "══════════════════════════════════════"
echo " 종합"
echo "══════════════════════════════════════"
for r in "${LOOP_RESULTS[@]}"; do
  echo "  $r"
done
echo ""
echo "결과: PASS=$PASS FAIL=$FAIL WARN=$WARN"
echo ""
echo "기술 준비 완료 시: docs/PILOT_DECLARATION.md (오픈 선언)"
echo "수동 잔여: B1 계정 배포 · B2 Slack 공지 · B5 에스컬레이션 · D Go 서명"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
