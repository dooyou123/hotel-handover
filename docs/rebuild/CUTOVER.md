# 운영 체크리스트 (Go-Live)

Next.js + Supabase + Vercel 배포 후 현장 전환 시 확인할 항목입니다.

관련 문서:

- [VERCEL-SETUP.md](./VERCEL-SETUP.md) — Vercel·env·Auth URL
- [UAT-CHECKLIST.md](./UAT-CHECKLIST.md) — 기능 검증
- [MANUAL.md](./MANUAL.md) — 현장 매뉴얼

---

## 배포 전

- [ ] Supabase 마이그레이션 001~003 적용
- [ ] Vercel env 3개 (Production·Preview·Development)
- [ ] Auth → Users: 직원 이메일·비밀번호 등록
- [ ] Auth → URL Configuration: Site URL = `https://hotel-handover.vercel.app`, Redirect URLs에 `https://*.vercel.app/**`
- [ ] UAT 체크리스트 실행 (2~3명)

## D-Day (현장 전환)

| 시간 | 작업 |
|------|------|
| 0:00 | 현장 PC에 새 URL 안내 |
| 0:15 | PC 5~6대 **로그인** + smoke (카드 추가, Realtime, 교대) |
| 0:30 | **Go** — 북마크를 `https://hotel-handover.vercel.app` 로 통일 |

### smoke (각 PC)

1. 로그인 → `/handover`
2. 교대·담당자 선택 → 카드 1건 추가·이동
3. 다른 PC에서 Realtime 반영 확인
4. 연락처 검색, 체크리스트 1건 체크
5. (매니저) 설정에서 직원 이름 확인

자동 smoke (선택):

```bash
cd web
npm run build
npm test
E2E_EMAIL=staff@hotel.com E2E_PASSWORD=xxx npm run test:e2e
```

## 환경 변수 (Vercel)

| 변수 | 비고 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `NEXT_PUBLIC_DEFAULT_HOTEL_ID` | `00000000-0000-4000-8000-000000000001` |
