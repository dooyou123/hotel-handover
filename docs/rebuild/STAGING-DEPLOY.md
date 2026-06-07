# 스테이징 배포 (Vercel + Supabase)

UAT·Preview 배포 가이드입니다.

---

## 1. Supabase

**옵션 A — 별도 스테이징 프로젝트 (권장)**

1. Supabase에서 새 프로젝트 `hotel-handover-staging`
2. SQL Editor에서 migration 순서 실행:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage.sql`
   - `supabase/migrations/003_amenities.sql`
3. Auth → Users: UAT 계정 3개 추가
4. manager 계정 role SQL (MANUAL.md §9)

**옵션 B — 프로덕션과 동일 프로젝트**

- UAT 기간만 사용; 테스트 데이터는 Supabase Dashboard에서 정리

### Auth URL

| 설정 | 값 |
|------|-----|
| Site URL | `https://YOUR-PROJECT.vercel.app` |
| Redirect URLs | `http://localhost:3000/**`, `https://*.vercel.app/**` |

---

## 2. Vercel 배포

**상세:** [`VERCEL-SETUP.md`](./VERCEL-SETUP.md)

1. Import Git Repository → **Root Directory:** `web`
2. Environment Variables 3개 (Production, Preview, Development)
3. `npm run check:env` → `npm run vercel:setup` 또는 `vercel --prod`

Preview 배포는 PR마다 `https://xxx.vercel.app` URL 생성.

---

## 3. UAT

1. [UAT-CHECKLIST.md](./UAT-CHECKLIST.md) 실행
2. PC 2대 Realtime 동시 테스트

---

## 4. E2E

```bash
cd web
npm run test:e2e
E2E_EMAIL=staff@example.com E2E_PASSWORD=secret npm run test:e2e
```

---

## 5. Go-Live

- [ ] UAT Go
- [ ] [CUTOVER.md](./CUTOVER.md) 체크리스트

---

## 롤백

- Vercel: 이전 deployment Promote
