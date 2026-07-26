import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import {
  DAY_OFF_COOKIE,
  checkDayOffPinRateLimit,
  clearDayOffPinRateLimit,
  clientIpFromRequest,
  dayOffCookieOptions,
  hasDayOffSecret,
  isValidAccessPinPlain,
  signDayOffSession,
  verifyAccessPin,
  verifyDayOffSession,
} from '@/lib/day-off/access';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(DAY_OFF_COOKIE)?.value;
  const session = verifyDayOffSession(token);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    hotelId: session.hotelId,
    expiresAt: session.exp,
  });
}

export async function POST(request: NextRequest) {
  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' },
      { status: 503 },
    );
  }
  if (!hasDayOffSecret()) {
    return NextResponse.json(
      { error: '서버에 DAY_OFF_ACCESS_SECRET(또는 SERVICE_ROLE)이 필요합니다.' },
      { status: 503 },
    );
  }

  let body: { pin?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const pin = body.pin?.trim() ?? '';
  if (!isValidAccessPinPlain(pin)) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 400 });
  }

  const ip = clientIpFromRequest(request);
  const rateKey = `day-off:${DEFAULT_HOTEL_ID}:${ip}`;
  const limit = checkDayOffPinRateLimit(rateKey);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `시도가 너무 많습니다. ${limit.retryAfterSec}초 후 다시 시도해 주세요.` },
      { status: 429 },
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('day_off_settings')
    .select('access_pin_hash')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pinHash = (data as { access_pin_hash?: string | null } | null)?.access_pin_hash;
  if (!pinHash || !verifyAccessPin(pin, pinHash)) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  clearDayOffPinRateLimit(rateKey);
  try {
    const token = signDayOffSession({ hotelId: DEFAULT_HOTEL_ID });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(DAY_OFF_COOKIE, token, dayOffCookieOptions());
    return response;
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : '세션 발급에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DAY_OFF_COOKIE, '', dayOffCookieOptions(0));
  return response;
}
