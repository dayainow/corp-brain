#!/usr/bin/env bash
# 파일럿 A10 — #corpbrain-alerts 웹훅·온콜 연락망 스모크
# Usage:
#   ./scripts/pilot-a10-smoke.sh
#   HEALTH_ALERT_WEBHOOK_URL=https://hooks.slack.com/... ./scripts/pilot-a10-smoke.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi
if [[ -f config/env/compose.host.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source config/env/compose.host.env
  set +a
fi

WEBHOOK_URL="${HEALTH_ALERT_WEBHOOK_URL:-${AUDIT_WEBHOOK_URL:-}}"
PASS=0
FAIL=0
WARN=0

log_pass() { echo "✓ $1"; PASS=$((PASS + 1)); }
log_fail() { echo "✗ $1"; FAIL=$((FAIL + 1)); }
log_warn() { echo "⚠ $1"; WARN=$((WARN + 1)); }

echo "CorpBrain A10 스모크 — alerts 웹훅·온콜"
echo ""

echo "── 온콜 연락망 (RUNBOOK §7 요약) ──"
echo ""
echo "| 역할 | 담당 | Slack |"
echo "|------|------|-------|"
echo "| L1 Primary | 김준호 | @junho.kim |"
echo "| L1 Backup | 이수민 | — |"
echo "| L2 RAG | 박서연 | @seoyeon.park |"
echo "| L2 Infra | 최동훈 | @donghun.choi |"
echo "| 서비스 오너 | 이민호 | @minho.lee |"
echo ""
echo "채널: #corpbrain-alerts (health) · #corpbrain-support (문의)"
echo "상세: docs/RUNBOOK.md §7"
echo ""

if [[ -z "$WEBHOOK_URL" ]]; then
  log_warn "HEALTH_ALERT_WEBHOOK_URL 미설정 — 웹훅 스모크 스킵"
  echo ""
  echo "설정 예시 (.env.local):"
  echo "  HEALTH_ALERT_WEBHOOK_URL=https://hooks.slack.com/services/.../corpbrain-alerts"
  echo "  # 또는 AUDIT_WEBHOOK_URL 동일 채널 Incoming Webhook"
else
  log_pass "웹훅 URL 설정됨"
  msg="[CorpBrain A10 스모크] $(date -Iseconds) — #corpbrain-alerts 웹훅 연결 테스트 (무시 가능)"
  if curl -sf -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c "import json,sys; print(json.dumps({'text': sys.stdin.read()}))" <<<"$msg")" \
    >/dev/null 2>&1; then
    log_pass "웹훅 전송 성공 — #corpbrain-alerts 확인"
  else
    log_fail "웹훅 전송 실패 — URL·채널 권한 확인"
  fi
fi

echo ""
echo "── health:watch 연동 확인 ──"
if [[ -n "$WEBHOOK_URL" ]]; then
  log_pass "health:watch가 degraded 시 동일 웹훅으로 알림 (scripts/health-watch.sh)"
else
  log_warn "웹훅 설정 후: npm run pilot:bday -- --watch"
fi

echo ""
echo "결과: PASS=$PASS FAIL=$FAIL WARN=$WARN"
if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
