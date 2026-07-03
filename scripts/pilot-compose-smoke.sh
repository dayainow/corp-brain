#!/usr/bin/env bash
# 파일럿 체크리스트 A3~A7 — Docker Compose 운영 스모크
# Usage:
#   ./scripts/pilot-compose-smoke.sh           # 배포 + 인덱싱 + health + eval
#   ./scripts/pilot-compose-smoke.sh --skip-deploy  # 이미 Compose 기동 시
#   ./scripts/pilot-compose-smoke.sh --index-only   # 인덱싱 + 검증만
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE_URL="${BASE_URL:-http://localhost:3000}"
SKIP_DEPLOY=false
INDEX_ONLY=false
PASS=0
FAIL=0
WARN=0

for arg in "$@"; do
  case "$arg" in
    --skip-deploy) SKIP_DEPLOY=true ;;
    --index-only) INDEX_ONLY=true; SKIP_DEPLOY=true ;;
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

load_auth_secret() {
  if [[ -z "${AUTH_SECRET:-}" && -f .env.local ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env.local
    set +a
  fi
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    log_fail "Docker CLI 없음 — Docker Desktop 또는 colima 설치 필요"
    echo ""
    echo "  brew install colima docker docker-compose"
    echo "  colima start"
    echo "  ./scripts/pilot-compose-smoke.sh"
    return 1
  fi
  if ! docker info >/dev/null 2>&1; then
    log_fail "Docker 데몬 미기동 — Docker Desktop 실행 또는 colima start"
    return 1
  fi
  log_pass "Docker 데몬 연결"
  return 0
}

check_auth_secret() {
  load_auth_secret
  if [[ -z "${AUTH_SECRET:-}" ]]; then
    log_fail "AUTH_SECRET 없음 (.env.local 또는 환경 변수)"
    return 1
  fi
  if [[ ${#AUTH_SECRET} -lt 32 ]]; then
    log_warn "AUTH_SECRET 32자 미만 (파일럿 A1 권장: openssl rand -base64 32)"
  else
    log_pass "AUTH_SECRET 설정됨 (${#AUTH_SECRET}자)"
  fi
  return 0
}

check_ollama() {
  if curl -fsS --max-time 5 "${OLLAMA_BASE_URL:-http://localhost:11434/v1}/models" >/dev/null 2>&1; then
    log_pass "Ollama 응답 (${OLLAMA_BASE_URL:-http://localhost:11434/v1})"
    return 0
  fi
  log_fail "Ollama 미응답 — 호스트에서 ollama serve / ollama run llama3"
  return 1
}

stop_dev_server_on_3000() {
  local pids
  pids=$(lsof -ti :3000 2>/dev/null || true)
  if [[ -z "$pids" ]]; then return 0; fi
  for pid in $pids; do
    local cmd
    cmd=$(ps -p "$pid" -o comm= 2>/dev/null || true)
    if [[ "$cmd" == *"node"* ]]; then
      log_warn "포트 3000 사용 중 (PID $pid) — Compose 앱과 충돌 가능. dev 서버 종료 권장"
    fi
  done
}

deploy_compose() {
  stop_dev_server_on_3000
  echo ""
  echo "==> A3: Compose 배포 (postgres + redis + app)"
  export AUTH_SECRET
  if ! bash "$ROOT/scripts/deploy-compose.sh"; then
    log_fail "deploy-compose.sh 실패"
    return 1
  fi
  log_pass "deploy-compose.sh 완료"
}

load_compose_host_env() {
  if [[ -f "$ROOT/config/env/compose.host.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT/config/env/compose.host.env"
    set +a
  fi
  export AUTH_SECRET
}

index_pgvector() {
  echo ""
  echo "==> A5: PgVector Vault 인덱싱"
  load_compose_host_env
  if ! npm run index:vault; then
    log_fail "index:vault 실패"
    return 1
  fi
  log_pass "index:vault 완료 (VECTOR_STORE=pgvector)"
}

assert_health() {
  echo ""
  echo "==> A6: /api/health 검증"
  local body
  if ! body=$(curl -fsS --max-time 15 "$BASE_URL/api/health"); then
    log_fail "health API 요청 실패 ($BASE_URL)"
    return 1
  fi

  node -e "
    const h = JSON.parse(process.argv[1]);
    const c = h.checks || {};
    const errors = [];
    if (h.status !== 'ok') errors.push('status=' + h.status + ' (기대: ok)');
    if (!(h.chunkCount > 0)) errors.push('chunkCount=' + h.chunkCount);
    if (c.ollama !== 'ok') errors.push('checks.ollama=' + c.ollama);
    if (h.vectorStore !== 'pgvector') errors.push('vectorStore=' + h.vectorStore);
    if (c.postgres !== 'ok') errors.push('checks.postgres=' + c.postgres);
    if (c.redis !== 'ok') errors.push('checks.redis=' + c.redis);
    if (errors.length) {
      console.error('HEALTH_FAIL:' + errors.join('; '));
      console.log(JSON.stringify(h, null, 2));
      process.exit(1);
    }
    console.log(JSON.stringify(h, null, 2));
  " "$body" || {
    log_fail "health 조건 미충족 (상세 위 참고)"
    return 1
  }
  log_pass "health ok · chunkCount>0 · ollama/redis/postgres ok · pgvector"
}

run_eval() {
  echo ""
  echo "==> A7: eval:search Hit@3 ≥ 80%"
  load_compose_host_env
  if ! EVAL_HIT3_THRESHOLD="${EVAL_HIT3_THRESHOLD:-0.8}" npm run eval:search; then
    log_fail "eval:search 미달"
    return 1
  fi
  log_pass "eval:search 통과 (Hit@3 ≥ ${EVAL_HIT3_THRESHOLD:-0.8})"
}

print_summary() {
  echo ""
  echo "=========================================="
  echo " 파일럿 Compose 스모크 결과"
  echo "=========================================="
  echo "  PASS: $PASS"
  echo "  FAIL: $FAIL"
  echo "  WARN: $WARN"
  echo "=========================================="
  if [[ $FAIL -gt 0 ]]; then
    echo "결과: FAIL — PILOT_CHECKLIST A항목 미충족"
    exit 1
  fi
  echo "결과: PASS — A3~A7 스모크 완료"
  echo "다음: A8 RBAC 로그인 — npm run test:e2e (auth.spec.ts)"
  echo "      A9 샘플 질문 — 브라우저 또는 e2e/chat.spec.ts"
}

main() {
  echo "CorpBrain 파일럿 Compose 스모크"
  echo "BASE_URL=$BASE_URL"
  echo ""

  check_auth_secret || true

  if [[ "$INDEX_ONLY" == true ]]; then
    require_docker || { print_summary; exit 1; }
    check_ollama || true
    index_pgvector
    assert_health || true
    run_eval || true
    print_summary
    exit 0
  fi

  require_docker || { print_summary; exit 1; }
  check_ollama || true

  if [[ "$SKIP_DEPLOY" != true ]]; then
    deploy_compose || { print_summary; exit 1; }
  else
    log_pass "배포 스킵 (--skip-deploy)"
  fi

  index_pgvector || { print_summary; exit 1; }
  assert_health || { print_summary; exit 1; }
  run_eval || { print_summary; exit 1; }
  print_summary
}

main "$@"
