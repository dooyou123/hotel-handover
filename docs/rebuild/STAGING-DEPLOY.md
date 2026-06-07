# 스테이징 배포 (Vercel + Supabase)

W6 UAT용 스테이징 환경 구축 가이드입니다.

---

## 1. Supabase (스테이징 프로젝트)

**옵션 A — 별도 스테이징 프로젝트 (권장)**

1. Supabase에서 새 프로젝트 `hotel-handover-staging`
2. SQL Editor에서 migration 순서 실행:
   - `web/supabase/migrations/001_initial_schema.sql`
   - `web/supabase/migrations/002_storage.sql`
   - `web/supabase/migrations/003_amenities.sql`
3. `web/supabase/seed.sql` (선택)
4. Auth → Users: UAT 계정 3개 추가
5. manager 계정 role SQL (MANUAL.md §9)

**옵션 B — 프로덕션과 동일 프로젝트**

- UAT 기간만 사용 후 컷오버; 테스트 데이터 `--replace` 마이그레이션 주의

### Auth URL

| 설정 | 값 |
|------|-----|
| Site URL | `https://YOUR-PROJECT.vercel.app` |
| Redirect URLs | `http://localhost:3000/**`, `https://*.vercel.app/**`, 프로덕션 도메인 |

---

## 2. Vercel 배포

**상세 절차:** [`VERCEL-SETUP.md`](../docs/rebuild/VERCEL-SETUP.md)

### 저장소 연결

1. [vercel.com](https://vercel.com) → Import Git Repository
2. **Root Directory:** `web` (monorepo인 경우 필수)
3. Framework Preset: **Next.js**

### Environment Variables

| 변수 | 환경 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
| `NEXT_PUBLIC_DEFAULT_HOTEL_ID` | `00000000-0000-4000-8000-000000000001` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Vercel에 넣지 않음** (마이그레이션은 로컬) |

배포 전 검사: `npm run check:env`

### 배포

```bash
cd web
npx vercel          # Preview (UAT)
npx vercel --prod   # Production
```

Preview 배포는 PR마다 `https://xxx.vercel.app` URL 생성 → UAT 공유용.

---

## 3. UAT 실행

1. 테스터에게 URL + 계정 전달
2. [UAT-CHECKLIST.md](./UAT-CHECKLIST.md) 인쇄 또는 공유
3. 결함은 GitHub Issue 또는 내부 시트에 기록
4. 수정 후 Preview 재배포 → 해당 항목 재검

### Realtime 동시 테스트

- PC 2대에서 같은 스테이징 URL
- A PC: 카드 추가 → B PC 5초 내 반영 확인

---

## 4. E2E (CI / 로컬)

```bash
cd web
npm run test:e2e

# 스테이징 대상 authenticated 테스트 (선택)
E2E_EMAIL=staff@example.com E2E_PASSWORD=secret npm run test:e2e
```

---

## 5. 컷오버 전 (W7)

- [ ] UAT Go 서명
- [ ] 프로덕션 Supabase + Vercel env 최종 확인
- [ ] `migrate-from-sqlite.js --replace` 리허설 (T-3)
- [ ] [PLAN.md](./PLAN.md) §8 Runbook 따라 D-Day 진행

---

## 6. 롤백

UAT 중 치명 결함 시:

- Vercel: 이전 deployment Promote
- 구 Express `:3847` 유지 중이면 북마크로 복귀
- Supabase staging 데이터는 폐기 가능 (프로덕션 컷오버 전)
