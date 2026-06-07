# hotel-handover (Next.js)

Next.js + Supabase Cloud 재구축 버전입니다. 구 Express 앱(`../public`, `../server`)과 병행 개발 후 **빅뱅 컷오버**합니다.

## 현재 상태 (W7 준비)

- [x] Next.js 16 App Router + TypeScript + Tailwind
- [x] Supabase client / server / middleware
- [x] 지정 사용자 로그인 (이메일 + 비밀번호)
- [x] 칸반 CRUD + DnD + Realtime + 필터·객실뷰
- [x] 공지, 댓글·첨부, 교대 시작/종료, 변경 기록
- [x] W4: 연락처, 체크리스트, 스케줄 CSV, 설정·템플릿
- [x] W5: 일일 요약 export, SQLite 마이그레이션, E2E
- [x] W6: **스테이징 UAT 가이드**, **매뉴얼**, **도움말 페이지**, UAT E2E 확장
- [x] **UI 복원**: 구 Express `styles.css` 기반 — 전 탭 + **모달·객실뷰** 포함
- [x] 어메니티 재고 탭 (`/amenity`)
- [ ] **W7 컷오버**: [CUTOVER.md](../docs/rebuild/CUTOVER.md) 실행
- [ ] **Vercel 배포**: [VERCEL-SETUP.md](../docs/rebuild/VERCEL-SETUP.md) (`npm run check:env` → `npm run deploy`)

## 시작하기

### 1. Supabase 프로젝트

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성
2. SQL Editor 또는 CLI로 마이그레이션 순서대로 실행:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage.sql`
   - `supabase/migrations/003_amenities.sql` ← **어메니티 탭 필수**
3. Auth → Providers → Email:
   - **Email** 활성화
   - **Allow new users to sign up** 끄기 (자가 가입 차단)
4. Auth → Users → **Add user** 로 직원 이메일·비밀번호 등록  
   (스크린샷처럼 Dashboard에서만 계정 생성)
5. Auth → URL Configuration:
   - Site URL: `http://localhost:3000`
6. SQL Editor에서 `supabase/migrations/002_storage.sql` 실행 (사진 첨부용 Storage)
7. SQL Editor에서 `supabase/migrations/003_amenities.sql` 실행 (어메니티 재고)

### 2. 환경 변수

```bash
cp .env.local.example .env.local
# Dashboard → Project Settings → API 에서 URL, anon key 복사
# 저장 후 dev 서버 반드시 재시작 (Ctrl+C → npm run dev)
```

### 3. 실행

```bash
cd web
npm install
npm run dev
```

http://localhost:3000 → `/handover` (로그인 필요)

### 3b. Vercel 배포 (Preview)

로컬 env가 준비됐다면:

```bash
cd web
npm run check:env      # 3개 public env 확인
npx vercel login       # 최초 1회
npx vercel link        # 프로젝트 연결 (Root Directory = web)
npm run deploy         # Preview URL 발급
```

Dashboard에서 **Environment Variables** 3개를 Preview·Production에 등록한 뒤 Redeploy.  
상세: [`docs/rebuild/VERCEL-SETUP.md`](../docs/rebuild/VERCEL-SETUP.md)

배포 후 Supabase **Auth → URL Configuration** 에 Preview/Production URL 추가.

### 4. 첫 사용자

Dashboard에서 사용자를 추가하면 `profiles` 행이 자동 생성됩니다.  
**트리거 이전에 만든 사용자**는 `profiles`가 없을 수 있습니다. 매니저 권한:

```sql
insert into public.profiles (id, hotel_id, display_name, role)
select
  u.id,
  '00000000-0000-4000-8000-000000000001',
  split_part(u.email, '@', 1),
  'manager'
from auth.users u
where u.email = 'YOUR_EMAIL@example.com'
on conflict (id) do update
set role = 'manager', updated_at = now();
```

적용 후 로그아웃 → 재로그인.

직원 목록(`staff` 테이블)은 migration seed 후 설정 탭(W4) 또는 SQL로 추가.

### 5. W5 — 일일 요약·마이그레이션·테스트

**일일 요약:** 인수인계 탭 → `일일 요약` (또는 교대 모달 → `일일 요약 내보내기`)

**SQLite 컷오버 마이그레이션:**

```bash
cd web
npm install
SUPABASE_URL=https://YOUR.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
node scripts/migrate-from-sqlite.js ../data/handover.db --replace
```

`--replace`: 해당 hotel_id 데이터를 지우고 SQLite에서 다시 가져옵니다.  
첨부 사진은 `data/uploads` → Supabase Storage `card-attachments` 로 업로드됩니다.

**테스트:**

```bash
npm test          # unit (일일 요약·스케줄 날짜)
npm run test:e2e  # Playwright smoke (dev 서버 자동 기동)
```

### 6. W6 — UAT · 매뉴얼 · 스테이징

| 문서 | 용도 |
|------|------|
| [`docs/rebuild/VERCEL-SETUP.md`](../docs/rebuild/VERCEL-SETUP.md) | **Vercel 배포 설정 (상세)** |
| [`docs/rebuild/MANUAL.md`](../docs/rebuild/MANUAL.md) | 현장 사용 매뉴얼 |
| [`docs/rebuild/UAT-CHECKLIST.md`](../docs/rebuild/UAT-CHECKLIST.md) | 2~3명 UAT 체크리스트 |
| [`docs/rebuild/STAGING-DEPLOY.md`](../docs/rebuild/STAGING-DEPLOY.md) | UAT·Preview·E2E 요약 |

앱 내 **도움말** (`/help`) — 로그인 후 헤더 우측 링크.

**스테이징 E2E (계정 있을 때):**

```bash
E2E_EMAIL=staff@hotel.com E2E_PASSWORD=xxx npm run test:e2e
```

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm test` | W5 unit tests |
| `npm run test:e2e` | Playwright E2E |
| `npm run check:env` | Vercel 배포 전 env 검증 |
| `npm run deploy` | Preview 배포 (`vercel`) |
| `npm run deploy:prod` | Production 배포 |
| `npm run migrate:sqlite -- ../data/handover.db --replace` | SQLite → Supabase |

## 컷오버 (W7)

[`docs/rebuild/CUTOVER.md`](../docs/rebuild/CUTOVER.md) — T-7 ~ D-Day runbook, 마이그레이션·smoke·롤백.

요약:

1. 스테이징에서 `migrate-from-sqlite.js --replace` **리허설**
2. UAT Go 후 D-Day에 프로덕션 마이그레이션
3. Vercel 프로덕션 URL + Supabase Auth URL 통일
4. 현장 PC 북마크 교체

`scripts/migrate-from-sqlite.js` 마지막에 SQLite vs Supabase **건수 대조**가 출력됩니다.
