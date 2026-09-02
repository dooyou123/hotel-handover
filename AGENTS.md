# AGENTS.md

## Cursor Cloud specific instructions

### 저장소 브랜치

- **`main`**: README 스텁만 있음 (앱 코드 없음)
- **`master`**: 전체 애플리케이션 (Next.js + Supabase 마이그레이션 + 문서)
- Cloud Agent 작업 시 **`master` 브랜치**를 사용하세요: `git checkout master`

### 서비스 구성

| 서비스 | 필수 | 실행 방법 |
|--------|------|-----------|
| Next.js (`web/`) | 예 | `cd web && npm run dev` → http://localhost:3000 |
| Supabase Cloud | 예 | 별도 프로세스 없음 — `.env.local`로 원격 프로젝트에 연결 |

로컬 Docker / `supabase start` 설정은 없습니다. DB는 Supabase Cloud SQL 마이그레이션(`supabase/migrations/`)으로 관리합니다.

### 환경 변수

`web/.env.local` (gitignore됨)에 다음이 필요합니다:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEFAULT_HOTEL_ID` (기본값: `00000000-0000-4000-8000-000000000001`)

검증: `cd web && node scripts/check-deploy-env.js`

로그인 후 E2E/UAT: `E2E_EMAIL`, `E2E_PASSWORD` 환경 변수 (Supabase Auth에 등록된 직원 계정)

### 자주 쓰는 명령 (`web/` 디렉터리)

| 명령 | 용도 |
|------|------|
| `npm run dev` | 개발 서버 (webpack, 기본) |
| `npm run dev:turbo` | Turbopack 모드 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint (기존 경고/에러가 있을 수 있음) |
| `npm test` | unit tests (`tsx --test`) |
| `npm run test:e2e` | Playwright E2E (Chromium 필요) |
| `npm run check:env` | 배포 전 env 검증 |

### Playwright

E2E 최초 실행 전: `cd web && npx playwright install chromium`

이미 dev 서버가 떠 있으면: `PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:e2e`

미로그인 smoke 3건은 `E2E_EMAIL`/`E2E_PASSWORD` 없이 통과합니다. 로그인 smoke는 계정 시크릿이 필요합니다.

### 개발 서버 팁

- 반드시 `web/`에서 실행 (`cd web` 후 `npm run dev`)
- `.env.local` 변경 후 dev 서버 재시작
- 캐시 이슈 시: `rm -rf web/.next` 후 재시작
