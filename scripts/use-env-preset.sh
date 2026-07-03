#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PRESET="${1:-}"

usage() {
  echo "Usage: npm run env:fast | npm run env:quality"
  echo "       bash scripts/use-env-preset.sh [fast|quality]"
  exit 1
}

case "$PRESET" in
  fast|quality) ;;
  *) usage ;;
esac

SRC="$ROOT/config/env/local.$PRESET.env"
DEST="$ROOT/.env.local"

if [[ ! -f "$SRC" ]]; then
  echo "ERROR: preset not found: $SRC"
  exit 1
fi

AUTH_SECRET=""
if [[ -f "$DEST" ]]; then
  AUTH_SECRET="$(grep -E '^AUTH_SECRET=' "$DEST" | head -1 | cut -d= -f2- || true)"
fi

if [[ -z "$AUTH_SECRET" ]]; then
  echo "ERROR: AUTH_SECRET가 없습니다. 먼저 .env.example을 복사해 AUTH_SECRET을 설정하세요."
  echo "  cp .env.example .env.local"
  echo "  AUTH_SECRET=\$(openssl rand -base64 32)"
  exit 1
fi

{
  echo "AUTH_SECRET=$AUTH_SECRET"
  grep -v '^AUTH_SECRET=' "$SRC"
} > "$DEST.tmp"
mv "$DEST.tmp" "$DEST"

echo "✓ .env.local → $PRESET 모드"
case "$PRESET" in
  fast)
    echo "  LLM: llama3 | Cross-encoder: OFF"
    echo "  더 가볍게: config/env/local.fast.env 에서 OLLAMA_MODEL=llama3.2:3b"
    ;;
  quality)
    echo "  LLM: llama3 | Cross-encoder: ON"
    echo "  (없으면) ollama pull llama3"
    ;;
esac
echo "  dev 서버 재시작 후 적용됩니다."
