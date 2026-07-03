#!/usr/bin/env bash
# B-Day 로컬/PoC env 준비 — SLACK_SIGNING_SECRET·웹훅 안내
# Usage:
#   ./scripts/pilot-env-bday.sh           # 점검 + 누락 시 SLACK_SIGNING_SECRET 생성
#   ./scripts/pilot-env-bday.sh --dry-run # 변경 없이 안내만
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    -h|--help)
      sed -n '2,5p' "$0"
      exit 0
      ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

ENV_FILE="${ROOT}/.env.local"
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
    echo "${key}=${val}" >>"$ENV_FILE"
  fi
}

echo "CorpBrain B-Day env 준비"
echo ""

# SLACK_SIGNING_SECRET
secret="$(get_env SLACK_SIGNING_SECRET)"
if [[ -n "$secret" ]]; then
  echo "✓ SLACK_SIGNING_SECRET 이미 설정됨"
else
  new_secret="$(openssl rand -hex 32)"
  echo "○ SLACK_SIGNING_SECRET 없음 — PoC용 시크릿 생성"
  if [[ "$DRY_RUN" == true ]]; then
    echo "  (dry-run) 생성될 값: ${new_secret:0:8}..."
  else
    set_env "SLACK_SIGNING_SECRET" "$new_secret"
    echo "✓ .env.local 에 SLACK_SIGNING_SECRET 추가됨"
    echo "  ※ Slack App Signing Secret과 동일하게 맞추거나,"
    echo "    로컬 스모크만: dev 서버 재기동 후 pilot:slack-smoke"
  fi
fi

# SLACK_USER_MAP
map="$(get_env SLACK_USER_MAP)"
if [[ -n "$map" ]]; then
  echo "✓ SLACK_USER_MAP 설정됨"
else
  echo "○ SLACK_USER_MAP 없음 — PoC 스모크용 기본값 설정"
  if [[ "$DRY_RUN" != true ]]; then
    set_env 'SLACK_USER_MAP' '{"U_PILOT_SMOKE":"kim.junho@novapay.kr"}'
    echo "✓ SLACK_USER_MAP 추가됨"
  fi
fi

# Webhook
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ENV_FILE"
  set +a
fi
webhook="${HEALTH_ALERT_WEBHOOK_URL:-${AUDIT_WEBHOOK_URL:-}}"
if [[ -n "$webhook" ]]; then
  echo "✓ HEALTH_ALERT_WEBHOOK_URL 또는 AUDIT_WEBHOOK_URL 설정됨"
else
  echo "○ 웹훅 미설정 — A10: Slack Incoming Webhook → .env.local"
  echo "  HEALTH_ALERT_WEBHOOK_URL=https://hooks.slack.com/services/..."
fi

echo ""
echo "다음 단계:"
echo "  1. npm run pilot:bday -- --step a10"
echo "  2. npm run pilot:bday -- --step b2"
echo "  3. npm run pilot:bday -- --step b4"

# Compose app에 Slack env 반영
if [[ "$DRY_RUN" != true ]] && [[ -n "$(docker compose ps --status running -q app 2>/dev/null || true)" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ENV_FILE"
  set +a
  echo ""
  echo "── Compose app 재기동 (Slack env 반영) ──"
  docker compose up -d app
  sleep 3
  echo "✓ app 컨테이너 재기동 완료"
fi
