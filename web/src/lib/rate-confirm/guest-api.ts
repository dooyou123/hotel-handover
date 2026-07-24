import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import {
  RC_GUEST_COOKIE,
  verifyGuestSession,
  type GuestSessionPayload,
} from '@/lib/rate-confirm/guest-auth';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';

export function serviceUnavailableResponse() {
  return NextResponse.json(
    { error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' },
    { status: 503 },
  );
}

export async function requireGuestSession(): Promise<
  { ok: true; session: GuestSessionPayload } | { ok: false; response: NextResponse }
> {
  if (!hasServiceRoleKey()) {
    return { ok: false, response: serviceUnavailableResponse() };
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(RC_GUEST_COOKIE)?.value;
  const session = verifyGuestSession(token);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: '게스트 세션이 없거나 만료되었습니다.' }, { status: 401 }),
    };
  }
  if (session.hotelId !== DEFAULT_HOTEL_ID) {
    return {
      ok: false,
      response: NextResponse.json({ error: '호텔 정보가 올바르지 않습니다.' }, { status: 403 }),
    };
  }
  return { ok: true, session };
}

export function guestServiceClient() {
  return createServiceClient();
}
