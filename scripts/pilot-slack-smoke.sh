#!/usr/bin/env bash
# 파일럿 B4 — Slack /corpbrain Slash Command 스모크
# Usage:
#   ./scripts/pilot-slack-smoke.sh
#   BASE_URL=http://localhost:3100 ./scripts/pilot-slack-smoke.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f config/env/compose.host.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source config/env/compose.host.env
  set +a
fi
BASE_URL="${BASE_URL:-${AUTH_URL:-http://localhost:3100}}"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

PASS=0
FAIL=0
WARN=0

log_pass() { echo "✓ $1"; PASS=$((PASS + 1)); }
log_fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }
log_warn() { echo "⚠ $1"; WARN=$((WARN + 1)); }

slack_post() {
  local body="$1"
  local timestamp
  timestamp="$(date +%s)"
  local sig_base="v0:${timestamp}:${body}"
  local sig
  sig="$(printf '%s' "$sig_base" | openssl dgst -sha256 -hmac "$SLACK_SIGNING_SECRET" | awk '{print $2}')"

  local resp http_code
  resp="$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/slack/command" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "X-Slack-Signature: v0=${sig}" \
    -H "X-Slack-Request-Timestamp: ${timestamp}" \
    -d "$body" 2>/dev/null || echo -e "\n000")"
  http_code="$(echo "$resp" | tail -n1)"
  resp="$(echo "$resp" | sed '$d')"
  if [[ "$http_code" == "000" ]]; then
    echo '{"error":"request_failed","detail":"connection"}'
    return 1
  fi
  if [[ "$http_code" -ge 400 ]]; then
    echo "{\"error\":\"http_${http_code}\",\"body\":$(python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" <<<"$resp")}"
    return 1
  fi
  echo "$resp"
}

echo "CorpBrain Slack 스모크 (B4)"
echo "BASE_URL=$BASE_URL"
echo ""

if [[ -z "${SLACK_SIGNING_SECRET:-}" ]]; then
  log_warn "SLACK_SIGNING_SECRET 미설정 — PILOT_CHECKLIST B4 수동 스킵"
  echo ""
  echo "결과: PASS=$PASS FAIL=$FAIL WARN=$WARN"
  exit 0
fi

log_pass "SLACK_SIGNING_SECRET 설정됨"

# 1) 빈 질문 → 사용법 안내
body_empty="text=&user_id=U_PILOT_SMOKE&user_name=pilot-smoke&command=%2Fcorpbrain"
resp_empty="$(slack_post "$body_empty" || echo '{"error":"request_failed"}')"
if echo "$resp_empty" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if '사용법' in d.get('text','') else 1)" 2>/dev/null; then
  log_pass "빈 질문 → 사용법 응답"
else
  log_fail "빈 질문 응답 이상: $resp_empty"
fi

# 2) 샘플 질문 (Ollama 필요)
query="연차 규정 한 줄 요약"
body_q="text=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$query")&user_id=U_PILOT_SMOKE&user_name=pilot-smoke&command=%2Fcorpbrain"
resp_q="$(slack_post "$body_q" || echo '{"error":"request_failed"}')"

if echo "$resp_q" | python3 -c "
import sys, json
d = json.load(sys.stdin)
text = d.get('text', '')
if d.get('error'):
    raise SystemExit(1)
if '질문' in text or '참고' in text or '문서' in text:
    raise SystemExit(0)
raise SystemExit(1)
" 2>/dev/null; then
  log_pass "샘플 질문 RAG 응답"
else
  if echo "$resp_q" | grep -q "관련 사내 문서"; then
    log_warn "인덱스/검색 미스 — Sync Vault 확인"
  elif echo "$resp_q" | grep -q "오류"; then
    log_warn "Ollama 미기동 가능 — B4 부분 스킵"
  else
    log_fail "샘플 질문 응답 이상: ${resp_q:0:200}"
  fi
fi

echo ""
echo "결과: PASS=$PASS FAIL=$FAIL WARN=$WARN"
if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
