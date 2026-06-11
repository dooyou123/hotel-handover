# 프런트 인수인계 보드

호텔 프런트 3교대용 **칸반형 인수인계 보드** — Next.js + Supabase + Vercel.

**Production:** https://hotel-handover.vercel.app

## 빠른 시작 (로컬)

```bash
cd web
npm install
cp .env.local.example .env.local   # Supabase URL·anon key 입력
npm run dev
```

http://localhost:3000 → 로그인 후 `/handover`

## 배포

```bash
cd web
npm run check:env
npm run vercel:setup:prod          # env 등록 + Production 배포
```

상세: [`docs/ops/VERCEL-SETUP.md`](docs/ops/VERCEL-SETUP.md)

## 문서

| 문서 | 용도 |
|------|------|
| [`web/README.md`](web/README.md) | 개발·스크립트·Supabase 설정 |
| [`docs/ops/MANUAL.md`](docs/ops/MANUAL.md) | 현장 사용 매뉴얼 |
| [`docs/ops/UAT-CHECKLIST.md`](docs/ops/UAT-CHECKLIST.md) | 기능 검증 체크리스트 |
| [`docs/ops/VERCEL-SETUP.md`](docs/ops/VERCEL-SETUP.md) | Vercel·env·Auth URL |

## 구조

```
web/           Next.js 앱 (Vercel Root Directory = web)
supabase/      SQL 마이그레이션
docs/ops/       운영·배포 문서
```
