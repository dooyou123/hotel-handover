# hotel-handover (Next.js)

Next.js + Supabase Cloud · Vercel 배포.

## 현재 상태

- [x] Next.js App Router + TypeScript + Tailwind
- [x] Supabase Auth (이메일 + 비밀번호) · Realtime · Storage
- [x] 전 탭 UI (인수인계, 연락처, 체크리스트, 스케줄, 어메니티, 설정, 도움말)
- [x] Vercel Production 배포

## 시작하기

### 1. Supabase

1. [supabase.com](https://supabase.com) 프로젝트 생성
2. SQL Editor에서 순서대로 실행:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage.sql`
   - `supabase/migrations/003_amenities.sql`
3. Auth → Email 활성화, **Allow new users to sign up** 끄기
4. Auth → Users → 직원 계정 추가
5. Auth → URL Configuration: Site URL + Redirect URLs (`https://*.vercel.app/**`)

### 2. 환경 변수

```bash
cp .env.local.example .env.local
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_DEFAULT_HOTEL_ID
```

> `vercel env pull`은 Development env만 가져와 `.env.local`을 덮어씁니다. 사용하지 마세요.

### 3. 실행

```bash
npm install
npm run dev
```

로컬에서 PC가 매우 느려지거나 팬·기계음이 심하면:

1. **`web/` 폴더에서만** 실행 (`cd web` 후 `npm run dev`)
2. 기본 dev는 **webpack** 모드(메모리 부담 적음). Turbopack은 `npm run dev:turbo`
3. 캐시 정리: `rm -rf .next` 후 다시 `npm run dev`
4. Cursor 등 다른 무거운 앱과 동시에 쓰면 RAM 7GB대 노트북에서 스왑이 발생해 마우스까지 느려질 수 있음

### 4. Vercel 배포

```bash
npm run check:env
npm run vercel:setup:prod
```

상세: [`docs/rebuild/VERCEL-SETUP.md`](../docs/rebuild/VERCEL-SETUP.md)

### 5. 관리자 권한 (필요 시)

```sql
insert into public.profiles (id, hotel_id, display_name, role)
select u.id, '00000000-0000-4000-8000-000000000001', split_part(u.email, '@', 1), 'manager'
from auth.users u
where u.email = 'YOUR_EMAIL@example.com'
on conflict (id) do update set role = 'manager', updated_at = now();
```

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm test` | unit tests |
| `npm run test:e2e` | Playwright E2E |
| `npm run check:env` | 배포 전 env 검증 |
| `npm run vercel:setup` | env upsert + Preview 배포 |
| `npm run vercel:setup:prod` | env upsert + Production 배포 |
| `npm run deploy` | Preview 배포 |
| `npm run deploy:prod` | Production 배포 |

## 문서

| 문서 | 용도 |
|------|------|
| [`MANUAL.md`](../docs/rebuild/MANUAL.md) | 현장 매뉴얼 |
| [`UAT-CHECKLIST.md`](../docs/rebuild/UAT-CHECKLIST.md) | UAT |
| [`VERCEL-SETUP.md`](../docs/rebuild/VERCEL-SETUP.md) | Vercel 설정 |
