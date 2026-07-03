#!/usr/bin/env bash
# /api/health 주기 폴링 — degraded/unhealthy 시 Slack·웹훅 알림
# Usage:
#   ./scripts/health-watch.sh
#   BASE_URL=https://corpbrain.internal INTERVAL_SEC=900 ./scripts/health-watch.sh
#   HEALTH_ALERT_WEBHOOK_URL=https://hooks.slack.com/... ./scripts/health-watch.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
INTERVAL_SEC="${INTERVAL_SEC:-900}"
WEBHOOK_URL="${HEALTH_ALERT_WEBHOOK_URL:-${AUDIT_WEBHOOK_URL:-}}"

LAST_ALERT_STATUS=""

send_alert() {
  local status="$1"
  local body="$2"
  local msg="[CorpBrain] health $status — $BASE_URL/api/health
$body"

  echo "$(date -Iseconds) ALERT: $status"
  echo "$body"

  if [[ -z "$WEBHOOK_URL" ]]; then
    echo "(웹훅 미설정 — HEALTH_ALERT_WEBHOOK_URL 또는 AUDIT_WEBHOOK_URL)"
    return 0
  fi

  curl -sf -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "import json,sys; print(json.dumps({'text': sys.stdin.read()}))" <<<"$msg")" \
    >/dev/null 2>&1 || echo "웹훅 전송 실패"
}

poll_once() {
  local raw http_code status chunk
  raw="$(curl -sf -w "\n%{http_code}" "$BASE_URL/api/health" 2>/dev/null || echo -e "\n000")"
  http_code="$(echo "$raw" | tail -n1)"
  raw="$(echo "$raw" | sed '$d')"

  if [[ "$http_code" == "000" ]]; then
    if [[ "$LAST_ALERT_STATUS" != "unreachable" ]]; then
      send_alert "unreachable" "서버에 연결할 수 없습니다."
      LAST_ALERT_STATUS="unreachable"
    fi
    return
  fi

  status="$(echo "$raw" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','unknown'))" 2>/dev/null || echo "unknown")"
  chunk="$(echo "$raw" | python3 -c "import sys,json; print(json.load(sys.stdin).get('chunkCount','?'))" 2>/dev/null || echo "?")"

  if [[ "$status" == "ok" ]]; then
    if [[ "$LAST_ALERT_STATUS" != "" && "$LAST_ALERT_STATUS" != "ok" ]]; then
      send_alert "recovered" "status=ok, chunkCount=$chunk"
    fi
    LAST_ALERT_STATUS="ok"
    echo "$(date -Iseconds) ok (chunkCount=$chunk)"
    return
  fi

  if [[ "$LAST_ALERT_STATUS" != "$status" ]]; then
    send_alert "$status" "HTTP $http_code, chunkCount=$chunk
$raw"
    LAST_ALERT_STATUS="$status"
  else
    echo "$(date -Iseconds) $status (알림 스킵 — 동일 상태)"
  fi
}

echo "CorpBrain health-watch"
echo "BASE_URL=$BASE_URL INTERVAL_SEC=$INTERVAL_SEC"
echo "Ctrl+C 종료"
echo ""

while true; do
  poll_once
  sleep "$INTERVAL_SEC"
done
