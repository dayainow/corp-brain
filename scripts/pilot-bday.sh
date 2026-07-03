#!/usr/bin/env bash
# CorpBrain B-Day 오픈 실행 (PILOT_OPEN §2.1~2.3)
# Usage:
#   ./scripts/pilot-bday.sh                    # B1~B3 안내 + health 확인
#   ./scripts/pilot-bday.sh --watch            # + health:watch 백그라운드
#   ./scripts/pilot-bday.sh --step a10         # A10 웹훅·온콜 스모크
#   ./scripts/pilot-bday.sh --step b1|b2|b3|b4 # 개별 B-Day 단계
#   ./scripts/pilot-bday.sh --all              # a10 + b1~b4 순서 실행
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

START_WATCH=false
STEP=""
RUN_ALL=false

args=("$@")
i=0
while [[ $i -lt ${#args[@]} ]]; do
  arg="${args[$i]}"
  case "$arg" in
    --watch) START_WATCH=true ;;
    --all) RUN_ALL=true ;;
    --step)
      i=$((i + 1))
      STEP="${args[$i]:-}"
      if [[ -z "$STEP" ]]; then
        echo "오류: --step 뒤에 a10|b1|b2|b3|b4 필요"; exit 1
      fi
      ;;
    --step=*) STEP="${arg#--step=}" ;;
    -h|--help)
      sed -n '2,9p' "$0"
      exit 0
      ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
  i=$((i + 1))
done

if [[ -f config/env/compose.host.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source config/env/compose.host.env
  set +a
fi
BASE_URL="${BASE_URL:-${AUTH_URL:-http://localhost:3100}}"

run_b1() {
  echo "── [B1] 계정·권한 배포 ──"
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
  echo "✓ B1 안내 출력 완료 — IT에서 계정 배포 확인"
  echo ""
}

run_b2() {
  echo "── [B2] 사용자 안내 (Slack #corpbrain-pilot 복사) ──"
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
  echo "✓ B2 — 위 블록을 #corpbrain-pilot에 붙여넣기"
  echo ""
}

run_b3() {
  echo "── [B3] health 확인 ──"
  body="$(curl -sf "$BASE_URL/api/health" 2>/dev/null || echo "")"
  if [[ -z "$body" ]]; then
    echo "✗ health 미응답 ($BASE_URL) — deploy:compose 또는 npm run dev"
    return 1
  fi
  status="$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")"
  chunk="$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('chunkCount',0))" 2>/dev/null || echo "0")"
  if [[ "$status" == "ok" && "$chunk" -gt 0 ]]; then
    echo "✓ health ok (chunkCount=$chunk)"
  else
    echo "⚠ health $status (chunkCount=$chunk) — RUNBOOK §4 참고"
    return 1
  fi
  echo ""
}

run_b4() {
  echo "── [B4] Slack /corpbrain 스모크 ──"
  npm run pilot:slack-smoke
  echo ""
}

run_a10() {
  echo "── [A10] alerts 웹훅·온콜 ──"
  bash scripts/pilot-a10-smoke.sh
  echo ""
}

run_watch() {
  if [[ "$START_WATCH" != true ]]; then
    return 0
  fi
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
  echo ""
}

if [[ "$RUN_ALL" == true ]]; then
  echo "CorpBrain B-Day 전체 단계 (A10 + B1~B4)"
  echo "BASE_URL=$BASE_URL"
  echo ""
  run_a10
  run_b1
  run_b2
  run_b3
  run_b4
  run_watch
  echo "선행 점검: npm run pilot:ready"
  echo "상세: docs/PILOT_OPEN.md"
  exit 0
fi

if [[ -n "$STEP" ]]; then
  echo "CorpBrain B-Day 단계: $STEP"
  echo "BASE_URL=$BASE_URL"
  echo ""
  case "$STEP" in
    a10) run_a10 ;;
    b1) run_b1 ;;
    b2) run_b2 ;;
    b3) run_b3 ;;
    b4) run_b4 ;;
    *)
      echo "알 수 없는 단계: $STEP (a10|b1|b2|b3|b4)"
      exit 1
      ;;
  esac
  exit 0
fi

# 기본: B1~B3 (기존 동작)
echo "CorpBrain B-Day 오픈 가이드"
echo "BASE_URL=$BASE_URL"
echo ""
run_b1
run_b2
run_b3

if [[ "$START_WATCH" == true ]]; then
  run_watch
else
  echo "모니터링 기동: BASE_URL=$BASE_URL npm run health:watch"
  echo "또는: npm run pilot:bday -- --watch"
fi

echo ""
echo "추가 단계:"
echo "  npm run pilot:bday -- --step a10   # A10 웹훅·온콜"
echo "  npm run pilot:bday -- --step b4    # Slack 스모크"
echo "  npm run pilot:bday -- --all        # 전체"
echo "  npm run pilot:env-bday             # SLACK_SIGNING_SECRET 준비"
echo ""
echo "선행 점검: npm run pilot:ready"
echo "상세: docs/PILOT_OPEN.md"
