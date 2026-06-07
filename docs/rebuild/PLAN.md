# Next.js + Supabase 재구축 계획 (확정)

> **결정 사항 (2026-06-06)**  
> - 인증: **Magic Link**  
> - 호스팅: **Supabase Cloud** + Vercel  
> - 컷오버: **빅뱅** (구 Express 앱 일괄 교체)

---

## 1. 목표

| Before | After |
|--------|-------|
| Express + SQLite + PC 1대 서버 | Next.js + Supabase Cloud |
| 새로고침해야 다른 PC 반영 | **Realtime** 자동 반영 |
| LAN `http://IP:3847` | `https://handover.{domain}` (Vercel) |
| 세션만 (로그인 없음) | **Magic Link** + RLS |

---

## 2. 아키텍처

```
[PC 1~6] ──HTTPS──▶ Vercel (Next.js 15 App Router)
                         │
                         ├── Server Actions / Route Handlers (export, migration)
                         │
                         └──▶ Supabase Cloud
                               ├── Postgres (데이터)
                               ├── Auth (Magic Link)
                               ├── Realtime (cards, notices, checklist…)
                               └── Storage (card-attachments)
```

**새 repo:** `hotel-handover-next` (구 `hotel-handover`는 컷오버까지 유지)

---

## 3. 인증 — Magic Link

### 흐름

1. 직원이 `@hotel.com` 이메일 입력
2. Supabase Auth가 Magic Link 메일 발송
3. 링크 클릭 → `/auth/callback` → 세션 쿠키
4. **「지금 근무」**(교대·이름)는 로그인 후 localStorage (기존 UX 유지)

### DB

```sql
profiles (
  id uuid PK → auth.users.id,
  hotel_id uuid,
  display_name text,
  role text check (role in ('staff','manager')),
  is_active boolean
)
```

- **staff**: 카드·공지·체크·연락처 CRUD
- **manager**: + 직원/템플릿/체크항목 관리, 완료칸 비우기, 삭제

### 사전 작업

- [ ] Supabase Dashboard → Auth → Email → Magic Link ON
- [ ] Redirect URLs: `http://localhost:3000/auth/callback`, `https://*.vercel.app/auth/callback`, 프로덕션 도메인
- [ ] 직원 이메일 목록 확보 → 컷오버 전 `inviteUserByEmail` 또는 Dashboard 초대

---

## 4. Realtime

| 테이블 | 구독 |
|--------|------|
| cards | ✅ 필수 |
| card_acknowledgments | ✅ |
| card_comments | ✅ |
| notices | ✅ |
| checklist_completions | ✅ |
| contacts, staff, … | invalidate on tab focus (선택) |

Publication: `supabase migrations`에서 `supabase_realtime` 추가.

---

## 5. 스키마

`supabase/migrations/001_initial_schema.sql` 참고.

- 모든 PK: `uuid`
- `hotel_id`: 단일 호텔 (seed 1 row)
- `legacy_id`: SQLite 이전용 integer (마이그레이션 후 nullable)

---

## 6. Next.js 구조

```
app/
  (auth)/login/page.tsx
  auth/callback/route.ts
  (app)/layout.tsx          # 탭 + session bar
  (app)/handover/page.tsx   # 칸반 + 객실
  (app)/contacts/page.tsx
  (app)/checklist/page.tsx
  (app)/schedule/page.tsx
  (app)/settings/page.tsx
  api/export/summary/route.ts
components/handover/...
lib/supabase/{client,server,middleware}.ts
```

**스택:** TypeScript, Tailwind, shadcn/ui, TanStack Query, @dnd-kit

---

## 7. 개발 일정 (빅뱅 전 전부 완료)

| 주 | 작업 | 산출물 |
|----|------|--------|
| **W1** | Supabase 프로젝트, migration, Auth, Next 보일러plate | 로그인 + 빈 레이아웃 |
| **W2** | 칸반 CRUD, DnD, Realtime, 필터·객실뷰 | **핵심 MVP** |
| **W3** | 공지, 댓글·첨부(Storage), 교대 시작/종료, activity | |
| **W4** | 연락처, 체크리스트, 스케줄 CSV, 설정·템플릿 | **기능 parity** |
| **W5** | 일일 요약 export, E2E, `migrate-from-sqlite.ts` | |
| **W6** | 스테이징 UAT (2~3명), 버그 수정, 매뉴얼 | ✅ 가이드·체크리스트·/help |
| **W7** | **빅뱅 컷오버** | [CUTOVER.md](./CUTOVER.md) |

---

## 8. 빅뱅 컷오버 Runbook

### T-7일

- [ ] Vercel 프로덕션/스테이징 배포 → [STAGING-DEPLOY.md](./STAGING-DEPLOY.md)
- [ ] Supabase Pro 백업 설정
- [ ] 직원 이메일+비밀번호 계정 등록·테스트
- [ ] UAT 체크리스트 실행 → [UAT-CHECKLIST.md](./UAT-CHECKLIST.md)

### T-3일

- [ ] **마이그레이션 리허설** (운영 DB 복사본 → Supabase staging)
- [ ] 카드/공지/첨부 건수 대조
- [ ] 5~6대 PC에서 Realtime 동시 편집 테스트

### T-1일

- [ ] 구 앱 read-only 안내 (선택)
- [ ] `handover.db` + `data/uploads` 백업

### D-Day (교대 사이 2~3시간)

| 시간 | 작업 |
|------|------|
| 0:00 | 구 `npm start` **중단**, 프런트에 점검 공지 |
| 0:10 | 최종 `handover.db` 스냅샷 |
| 0:20 | `scripts/migrate-from-sqlite.ts` → Supabase **production** |
| 0:50 | 검증 쿼리 (건수, 샘플 카드, 첨부 URL) |
| 1:00 | Vercel 프로덕션 env 확인, DNS/북마크 **새 URL** |
| 1:15 | PC 5~6대 **이메일+비밀번호 로그인** + smoke test |
| 1:30 | **Go** — 구 앱 URL 폐기 |

### 롤백 (1시간 내 결정)

- Vercel maintenance + 구 서버 `npm start` + `:3847` 북마크 복구
- Supabase 데이터는 당일 쓰기분 폐기 (리허설에서 롤백 절차 1회 연습)

### T+14일

- [ ] 구 Express 코드 archive 브랜치
- [ ] SQLite 백업 보관 후 서버 PC 역할 변경

---

## 9. 환경 변수

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # 서버만 — migrate/export

NEXT_PUBLIC_DEFAULT_HOTEL_ID= # seed hotel uuid
```

---

## 10. 비용 (참고)

- Supabase Free → 소규모 테스트
- **Pro ~$25/월** (백업·용량) — 컷오버 전 Pro 권장
- Vercel Hobby/Pro (팀 규모에 따라)

---

## 11. 다음 작업 (구현 시작)

1. `hotel-handover-next` repo 생성 (`create-next-app`)
2. `supabase link` + `001_initial_schema.sql` push
3. 이메일+비밀번호 login 페이지
4. Phase: handover board + Realtime

---

## 12. 체크리스트 — 기능 parity

- [ ] 칸반 3칸 + DnD + Realtime
- [ ] 긴급 확인, 담당/마감, 키워드·경과·연체
- [ ] 객실 뷰, 필터, 검색
- [ ] 템플릿 (설정)
- [ ] 공지/변경, 핀, 유효기간
- [ ] 댓글, 사진(Storage)
- [ ] 교대 시작/종료
- [ ] activity log, 일일 요약 export
- [ ] 연락처, 즐겨찾기
- [ ] 체크리스트
- [ ] 스케줄 CSV
- [ ] 설정: 직원, 체크항목, 템플릿
- [x] UAT 문서·매뉴얼·도움말 페이지 (W6)
