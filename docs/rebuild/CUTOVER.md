# W7 — 빅뱅 컷오버 Runbook

구 Express + SQLite 앱을 **한 번에** Next.js + Supabase로 교체합니다.  
인증은 **이메일 + 비밀번호** (Supabase Dashboard에서만 사용자 추가, 자가 가입 OFF).

관련 문서:

- [VERCEL-SETUP.md](./VERCEL-SETUP.md) — Vercel 프로젝트·env·Auth URL (상세)
- [STAGING-DEPLOY.md](./STAGING-DEPLOY.md) — UAT·Preview 요약
- [UAT-CHECKLIST.md](./UAT-CHECKLIST.md) — Go/No-Go
- [MANUAL.md](./MANUAL.md) — 현장 매뉴얼

---

## T-7일

- [ ] Vercel **프로덕션** + (선택) **Preview** 배포 → [VERCEL-SETUP.md](./VERCEL-SETUP.md)
- [ ] Supabase **Pro** 백업·Point-in-time recovery 설정
- [ ] Auth → Users: 직원 **이메일·비밀번호** 등록, `profiles.role = manager` 확인
- [ ] Auth → URL Configuration: Site URL = 프로덕션 URL, Redirect URLs에 `/auth/callback` 포함
- [ ] UAT 체크리스트 실행 (2~3명) → 버그 수정 후 **Go** 결정

## T-3일

- [ ] **마이그레이션 리허설** (아래 명령, **스테이징** Supabase 대상)

```bash
cd web
npm install
SUPABASE_URL=https://YOUR-STAGING.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role \
node scripts/migrate-from-sqlite.js ../data/handover.db --replace
```

- [ ] 스크립트 마지막 **Verification** 줄에서 SQLite vs Supabase 건수 **OK** 확인
- [ ] 샘플 카드·공지·첨부 URL 브라우저에서 열기
- [ ] 5~6대 PC Realtime 동시 편집 테스트

## T-1일

- [ ] (선택) 구 앱 `:3847` read-only 안내
- [ ] `data/handover.db` + `data/uploads/` **오프라인 백업** (USB/클라우드)

## D-Day (교대 사이 2~3시간)

| 시간 | 작업 |
|------|------|
| 0:00 | 구 `npm start` **중단**, 프런트 PC에 점검 안내 |
| 0:10 | 최종 `handover.db` 스냅샷 + `uploads` 복사 |
| 0:20 | **프로덕션** Supabase에 마이그레이션 (`--replace`) |
| 0:50 | Verification OK, 샘플 데이터·첨부 확인 |
| 1:00 | Vercel 프로덕션 env (`NEXT_PUBLIC_*`, `HOTEL_ID`) 최종 확인 |
| 1:15 | PC 5~6대 **로그인** + smoke (카드 추가, Realtime, 교대, 일일 요약) |
| 1:30 | **Go** — 북마크를 새 URL로 통일, 구 앱 URL 폐기 |

### D-Day 마이그레이션 명령

```bash
cd web
SUPABASE_URL=https://YOUR-PROD.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-role \
node scripts/migrate-from-sqlite.js /path/to/final/handover.db --replace
```

`003_amenities.sql`은 컷오버 전에 이미 적용되어 있어야 합니다 (어메니티 탭).

### D-Day smoke (각 PC)

1. 로그인 → `/handover`
2. 교대·담당자 선택 → 카드 1건 추가·이동
3. 다른 PC에서 Realtime 반영 확인
4. 연락처 검색, 체크리스트 1건 체크
5. (매니저) 설정에서 직원 이름 확인

자동 smoke (선택):

```bash
npm run build
npm test
E2E_EMAIL=staff@hotel.com E2E_PASSWORD=xxx npm run test:e2e
```

## 롤백 (1시간 내 결정)

1. Vercel maintenance 또는 DNS 되돌리기
2. 구 서버 PC에서 `npm start` → `:3847` 북마크 복구
3. Supabase 당일 쓰기분은 폐기 (리허설 때 롤백 1회 연습 권장)

## T+14일

- [ ] 구 Express 코드 archive 브랜치
- [ ] SQLite·uploads 백업 보관 후 서버 PC 역할 변경

---

## 환경 변수 체크리스트 (Vercel)

| 변수 | 비고 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 프로덕션 프로젝트 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | |
| `NEXT_PUBLIC_DEFAULT_HOTEL_ID` | `00000000-0000-4000-8000-000000000001` |
| `SUPABASE_SERVICE_ROLE_KEY` | **서버 전용** — 마이그레이션·API Route만 |

`SUPABASE_SERVICE_ROLE_KEY`는 Vercel에 넣지 않아도 앱 동작에는 문제 없습니다. 마이그레이션은 로컬/CI에서 service role로 실행합니다.
