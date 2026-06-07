#!/usr/bin/env bash
# Vercel 프로젝트 연결 + env 등록/갱신 + Preview/Production 배포
# 사용: cd web && bash scripts/vercel-setup.sh [--prod] [--deploy-only]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/.env.local"
PROD=false
DEPLOY_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --prod) PROD=true ;;
    --deploy-only) DEPLOY_ONLY=true ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "오류: $ENV_FILE 없음. cp .env.local.example .env.local 후 Supabase 키를 넣으세요."
  exit 1
fi

node scripts/check-deploy-env.js

get_env() {
  local key="$1"
  local line
  line=$(grep -E "^${key}=" "$ENV_FILE" | tail -1 || true)
  if [[ -z "$line" ]]; then
    echo "오류: $ENV_FILE 에 ${key} 없음" >&2
    exit 1
  fi
  echo "${line#*=}" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

echo "==> Vercel 로그인 확인"
npx vercel whoami

echo "==> 프로젝트 연결 (hotel-handover)"
npx vercel link --yes --project hotel-handover 2>/dev/null || npx vercel link --yes

upsert_env() {
  local key="$1"
  local value="$2"
  local env
  echo "    ~ $key"
  for env in production preview development; do
    if printf '%s' "$value" | npx vercel env update "$key" "$env" --yes; then
      echo "      ✓ $env (updated)"
    elif printf '%s' "$value" | npx vercel env add "$key" "$env" --yes --no-sensitive; then
      echo "      ✓ $env (added)"
    else
      echo "      ✗ $env 실패 — Dashboard에서 수동 확인" >&2
      exit 1
    fi
  done
}

if ! $DEPLOY_ONLY; then
  echo "==> Environment Variables 등록/갱신 (.env.local 기준)"
  upsert_env "NEXT_PUBLIC_SUPABASE_URL" "$(get_env NEXT_PUBLIC_SUPABASE_URL)"
  upsert_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$(get_env NEXT_PUBLIC_SUPABASE_ANON_KEY)"
  upsert_env "NEXT_PUBLIC_DEFAULT_HOTEL_ID" "$(get_env NEXT_PUBLIC_DEFAULT_HOTEL_ID)"
  echo ""
  npx vercel env ls
fi

echo "==> 배포"
if $PROD; then
  npx vercel --prod --yes
else
  npx vercel --yes
fi

echo ""
echo "완료. Supabase Auth → URL Configuration 에 배포 URL을 추가하세요."
echo "  Site URL + Redirect URLs: https://YOUR-PROJECT.vercel.app/**"
