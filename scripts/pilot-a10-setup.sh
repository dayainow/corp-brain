#!/usr/bin/env bash
# A10 — #corpbrain-alerts Incoming Webhook 설정 및 알림 검증
# Usage:
#   ./scripts/pilot-a10-setup.sh --webhook-url 'https://hooks.slack.com/services/...'
#   HEALTH_ALERT_WEBHOOK_URL=https://hooks.slack.com/... ./scripts/pilot-a10-setup.sh
#   ./scripts/pilot-a10-setup.sh --verify-only   # .env.local 기존 URL로 재검증
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

load_pilot_secrets() {
  if [[ -f config/pilot-secrets.env ]]; then
    set -a
    # shellcheck disable=SC1091
    source config/pilot-secrets.env
    set +a
  fi
  if [[ -f .env.local ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env.local
    set +a
  fi
}

ENV_FILE="${ROOT}/.env.local"
WEBHOOK_URL="${HEALTH_ALERT_WEBHOOK_URL:-}"
VERIFY_ONLY=false

load_pilot_secrets

for arg in "$@"; do
  case "$arg" in
    --verify-only) VERIFY_ONLY=true ;;
    --webhook-url)
      echo "오류: --webhook-url 뒤에 URL 필요"; exit 1
      ;;
    --webhook-url=*) WEBHOOK_URL="${arg#--webhook-url=}" ;;
    -h|--help)
      sed -n '2,6p' "$0"
      exit 0
      ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

args=("$@")
i=0
while [[ $i -lt ${#args[@]} ]]; do
  if [[ "${args[$i]}" == "--webhook-url" ]]; then
    i=$((i + 1))
    WEBHOOK_URL="${args[$i]:-}"
  fi
  i=$((i + 1))
done

touch "$ENV_FILE"

get_env() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true
}

set_env() {
  local key="$1"
  local val="$2"
  if grep -qE "^${key}=" "$ENV_FILE" 2>/dev/null; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
    else
      sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
    fi
  else
    echo "" >>"$ENV_FILE"
    echo "# A10 health degraded 알림 (#corpbrain-alerts)" >>"$ENV_FILE"
    echo "${key}=${val}" >>"$ENV_FILE"
  fi
}

validate_webhook_url() {
  local url="$1"
  if [[ ! "$url" =~ ^https://hooks\.slack\.com/services/ ]]; then
    echo "오류: Slack Incoming Webhook 형식이 아닙니다."
    echo "  예: https://hooks.slack.com/services/T000/B000/XXXX"
    exit 1
  fi
}

echo "CorpBrain A10 웹훅 설정·검증"
echo ""

if [[ "$VERIFY_ONLY" == true ]]; then
  load_pilot_secrets
  WEBHOOK_URL="${HEALTH_ALERT_WEBHOOK_URL:-${AUDIT_WEBHOOK_URL:-}}"
  if [[ -z "$WEBHOOK_URL" ]]; then
    echo "오류: .env.local에 HEALTH_ALERT_WEBHOOK_URL 없음"
    exit 1
  fi
else
  if [[ -z "$WEBHOOK_URL" ]]; then
    WEBHOOK_URL="$(get_env HEALTH_ALERT_WEBHOOK_URL)"
  fi
  if [[ -z "$WEBHOOK_URL" ]]; then
    echo "Slack #corpbrain-alerts Incoming Webhook URL이 필요합니다."
    echo ""
    echo "1) Slack 워크스페이스 → #corpbrain-alerts 채널"
    echo "2) 채널 이름 클릭 → Integrations → Incoming Webhooks → Add"
    echo "3) 아래 중 하나로 설정:"
    echo "   npm run pilot:a10-setup -- --webhook-url 'https://hooks.slack.com/services/...'"
    echo "   cp config/pilot-secrets.env.example config/pilot-secrets.env  # URL 편집 후 재실행"
    exit 1
  fi
  validate_webhook_url "$WEBHOOK_URL"
  set_env "HEALTH_ALERT_WEBHOOK_URL" "$WEBHOOK_URL"
  echo "✓ .env.local 에 HEALTH_ALERT_WEBHOOK_URL 저장됨"
fi

# Compose app에 웹훅 env 반영
if [[ -n "$(docker compose ps --status running -q app 2>/dev/null || true)" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ENV_FILE"
  set +a
  echo "── Compose app 재기동 (웹훅 env 반영) ──"
  docker compose up -d app
  sleep 3
  echo "✓ app 컨테이너 재기동 완료"
  echo ""
fi

echo "── 1) A10 스모크 메시지 전송 ──"
export HEALTH_ALERT_WEBHOOK_URL="$WEBHOOK_URL"
bash scripts/pilot-a10-smoke.sh

echo ""
echo "── 2) health:watch 알림 형식 스모크 ──"
test_msg="[CorpBrain A10 검증] $(date -Iseconds) — health:watch 알림 형식 테스트 (무시 가능)"
if curl -sf -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "import json,sys; print(json.dumps({'text': sys.stdin.read()}))" <<<"$test_msg")" \
  >/dev/null 2>&1; then
  echo "✓ health:watch 형식 메시지 전송 성공"
else
  echo "✗ health:watch 형식 메시지 전송 실패"
  exit 1
fi

echo ""
echo "── 3) PILOT_CHECKLIST A10 ──"
echo "✓ #corpbrain-alerts 웹훅 연결 검증 완료"
echo "  수동: RUNBOOK §7 온콜 연락망을 팀에 공유"
echo ""
echo "모니터링 기동:"
echo "  export BASE_URL=http://localhost:3100"
echo "  npm run pilot:bday -- --watch"
