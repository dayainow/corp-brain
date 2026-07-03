#!/usr/bin/env bash
# CorpBrain B-Day 오픈 실행 (PILOT_OPEN §2.1~2.3)
# Usage:
#   ./scripts/pilot-bday.sh              # B1~B3 안내 + health 확인
#   ./scripts/pilot-bday.sh --watch      # + health:watch 백그라운드 기동
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

START_WATCH=false
for arg in "$@"; do
  case "$arg" in
    --watch) START_WATCH=true ;;
    -h|--help)
      sed -n '2,6p' "$0"
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
BASE_URL="${BASE_URL:-${AUTH_URL:-http://localhost:3100}}"

echo "CorpBrain B-Day 오픈 가이드"
echo "BASE_URL=$BASE_URL"
echo ""

echo "── B1 계정·권한 배포 ──"
echo ""
echo "| 역할 | 이름 | 이메일 | 비밀번호 (PoC) |"
echo "|------|------|--------|----------------|"
echo "| general | 김준호 | kim.junho@novapay.kr | novapay2026 |"
echo "| general | 정해인 | jung.haein@novapay.kr | novapay2026 |"
echo "| manager | 박수연 | park.suyeon@novapay.kr | novapay2026 |"
echo "| manager | 최유나 | choi.yuna@novapay.kr | novapay2026 |"
echo "| admin | 이민호 | lee.minho@novapay.kr | novapay2026 |"
echo ""
echo "※ 파일럿 종료 후 비밀번호 변경 · Google SSO는 DEPLOY.md 참고"
echo ""

echo "── B2 사용자 안내 (Slack #corpbrain-pilot 복사) ──"
echo ""
cat <<EOF
안녕하세요, CorpBrain 파일럿이 오늘부터 시작됩니다.

🔗 접속: ${BASE_URL}/
📖 사용법: 로그인 후 상단 "가이드" 또는 ${BASE_URL}/guide
💡 예시 질문: "연차 신청 방법", "경비 정산 규정"
📂 문서 트리: 보기(원문) / 질문(채팅) 버튼
💬 답변 아래 "이어서 물어보기" 칩 활용

답변 아래 👍/👎 피드백 부탁드립니다.
문제·개선: #corpbrain-alerts 멘션
EOF
echo ""

echo "── B3 health 확인 ──"
body="$(curl -sf "$BASE_URL/api/health" 2>/dev/null || echo "")"
if [[ -z "$body" ]]; then
  echo "✗ health 미응답 ($BASE_URL) — deploy:compose 또는 npm run dev"
  exit 1
fi
status="$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")"
chunk="$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('chunkCount',0))" 2>/dev/null || echo "0")"
if [[ "$status" == "ok" && "$chunk" -gt 0 ]]; then
  echo "✓ health ok (chunkCount=$chunk)"
else
  echo "⚠ health $status (chunkCount=$chunk) — RUNBOOK §4 참고"
fi
echo ""

if [[ "$START_WATCH" == true ]]; then
  mkdir -p data
  LOG_FILE="${ROOT}/data/health-watch.log"
  PID_FILE="${ROOT}/data/health-watch.pid"

  if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "health:watch 이미 실행 중 (PID $(cat "$PID_FILE"))"
  else
    export BASE_URL
    export INTERVAL_SEC="${INTERVAL_SEC:-900}"
    nohup bash scripts/health-watch.sh >>"$LOG_FILE" 2>&1 &
    echo $! >"$PID_FILE"
    echo "✓ health:watch 백그라운드 시작 (PID $(cat "$PID_FILE"))"
    echo "  로그: $LOG_FILE"
    echo "  중지: kill \$(cat $PID_FILE)"
  fi
else
  echo "모니터링 기동: BASE_URL=$BASE_URL npm run health:watch"
  echo "또는: npm run pilot:bday -- --watch"
fi

echo ""
echo "선행 점검: npm run pilot:ready"
echo "상세: docs/PILOT_OPEN.md"
