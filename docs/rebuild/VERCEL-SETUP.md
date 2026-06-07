# Vercel 배포 설정 (상세)

스테이징 UAT → 프로덕션 컷오버까지 Vercel 프로젝트를 만드는 절차입니다.  
앱 코드는 `web/` 디렉터리에 있습니다.

---

## 0. 사전 조건

- [ ] Git 저장소에 커밋·push (Vercel Git 연동 시 필수)
- [ ] Supabase 프로젝트 생성 + migration 001·002·003 적용
- [ ] 로컬 `web/.env.local` 로 `npm run dev` 동작 확인

로컬 env 검사:

```bash
cd web
node scripts/check-deploy-env.js
```

---

## 1. Vercel 프로젝트 생성

1. [vercel.com/new](https://vercel.com/new) → 저장소 Import
2. **Root Directory:** `web` ← monorepo이므로 **필수**
3. Framework: **Next.js** (자동 감지)
4. Build Command / Output: 기본값 (`vercel.json` 참고)

### Production vs Preview

| 배포 | URL 예 | 용도 |
|------|--------|------|
| **Preview** | `hotel-handover-xxx.vercel.app` | PR·UAT |
| **Production** | `hotel-handover.vercel.app` 또는 커스텀 도메인 | 현장 운영 |

UAT는 Preview URL로 충분합니다. 컷오버 전 Production을 스테이징으로 쓰지 말고 Preview 또는 별도 Supabase staging을 권장합니다.

---

## 2. Environment Variables (Vercel Dashboard)

**Project → Settings → Environment Variables**

| 변수 | Production | Preview | Development | 값 |
|------|:----------:|:-------:|:-----------:|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | ✓ | ✓ | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | ✓ | ✓ | anon key |
| `NEXT_PUBLIC_DEFAULT_HOTEL_ID` | ✓ | ✓ | ✓ | `00000000-0000-4000-8000-000000000001` |

**Vercel에 넣지 않음:** `SUPABASE_SERVICE_ROLE_KEY` (마이그레이션은 로컬/CI에서만)

변수 추가 후 **Redeploy** 필요.

---

## 3. Supabase Auth URL (배포 후 1회)

배포가 끝나면 Vercel **Production** 또는 UAT용 **Preview** URL을 확인합니다.

**Supabase → Authentication → URL Configuration**

| 항목 | 값 |
|------|-----|
| **Site URL** | `https://YOUR-DEPLOY.vercel.app` |
| **Redirect URLs** (한 줄씩) | `http://localhost:3000/**` |
| | `https://*.vercel.app/**` |
| | `https://YOUR-DEPLOY.vercel.app/**` |

커스텀 도메인 연결 시 해당 `https://handover.example.com/**` 도 추가.

이메일+비밀번호 로그인만 사용하므로 `/auth/callback`은 OAuth용이지만, Redirect URLs에 `/**` 패턴을 두면 안전합니다.

---

## 4. CLI 배포 (선택)

```bash
cd web
npm install -g vercel   # 또는 npx vercel
vercel login
vercel link             # 프로젝트 연결
vercel                  # Preview
vercel --prod           # Production
```

`.vercel/` 폴더는 gitignore 처리됨 (로컬 연결 정보).

---

## 5. 배포 후 확인

1. `https://YOUR-DEPLOY.vercel.app/login` — 로그인
2. `/handover` — 보드·Realtime
3. 카드 추가 → 다른 브라우저/PC에서 반영 (5초 내)
4. 사진 첨부 — Storage bucket `card-attachments` CORS/정책
5. `/amenity` — 003 migration 적용 여부

문제 시 Vercel **Deployments → Logs**, Supabase **Logs → Auth**.

---

## 6. GitHub 연동 (자동 Preview)

- main push → Production (설정에 따라)
- PR → Preview URL 자동 생성 → UAT 체크리스트 공유

---

## 7. 컷오버 (W7)

- Production env = **프로덕션 Supabase** 프로젝트 키
- Site URL = **최종 현장 URL**
- [CUTOVER.md](./CUTOVER.md) D-Day runbook

---

## 파일 참고

| 파일 | 역할 |
|------|------|
| `web/vercel.json` | 리전(icn1), install/build, 보안 헤더 |
| `web/scripts/check-deploy-env.js` | env 검증 |
| [STAGING-DEPLOY.md](./STAGING-DEPLOY.md) | UAT·E2E 요약 |
