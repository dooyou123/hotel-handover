import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import {
  RC_GUEST_COOKIE,
  checkPinRateLimit,
  clearPinRateLimit,
  clientIpFromRequest,
  guestCookieOptions,
  hasGuestSecret,
  isValidGuestEmail,
  isValidGuestPinPlain,
  normalizeGuestEmail,
  signGuestSession,
  verifyGuestOtpHash,
  verifyGuestPin,
  verifyGuestSession,
} from '@/lib/rate-confirm/guest-auth';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(RC_GUEST_COOKIE)?.value;
  const session = verifyGuestSession(token);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    hotelId: session.hotelId,
    expiresAt: session.exp,
  });
}

async function tryConsumeOtp(input: {
  supabase: ReturnType<typeof createServiceClient>;
  email: string;
  pin: string;
}): Promise<boolean> {
  const { data: rows, error } = await input.supabase
    .from('rate_confirm_guest_otps')
    .select('id, code_hash, expires_at, consumed_at')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('email', input.email)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !rows?.length) return false;

  for (const row of rows) {
    if (!verifyGuestOtpHash(input.pin, row.code_hash as string)) continue;
    const { error: updateError } = await input.supabase
      .from('rate_confirm_guest_otps')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('consumed_at', null);
    if (updateError) return false;
    return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' },
      { status: 503 },
    );
  }
  if (!hasGuestSecret()) {
    return NextResponse.json(
      { error: '서버에 RATE_CONFIRM_GUEST_SECRET(또는 SERVICE_ROLE)이 필요합니다.' },
      { status: 503 },
    );
  }

  let body: { pin?: string; email?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const pin = body.pin?.trim() ?? '';
  if (!isValidGuestPinPlain(pin)) {
    return NextResponse.json({ error: 'PIN이 올바르지 않습니다.' }, { status: 400 });
  }

  const ip = clientIpFromRequest(request);
  const rateKey = `${DEFAULT_HOTEL_ID}:${ip}`;
  const limit = checkPinRateLimit(rateKey);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `시도가 너무 많습니다. ${limit.retryAfterSec}초 후 다시 시도해 주세요.` },
      { status: 429 },
    );
  }

  const supabase = createServiceClient();
  const email = normalizeGuestEmail(body.email ?? '');

  if (email && isValidGuestEmail(email)) {
    const otpOk = await tryConsumeOtp({ supabase, email, pin });
    if (otpOk) {
      clearPinRateLimit(rateKey);
      try {
        const token = signGuestSession({ hotelId: DEFAULT_HOTEL_ID });
        const response = NextResponse.json({ ok: true, via: 'otp' });
        response.cookies.set(RC_GUEST_COOKIE, token, guestCookieOptions());
        return response;
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : '세션 발급에 실패했습니다.';
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  }

  const { data: hotel, error } = await supabase
    .from('hotels')
    .select('id, rate_confirm_guest_pin_hash')
    .eq('id', DEFAULT_HOTEL_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pinHash = (hotel as { rate_confirm_guest_pin_hash?: string | null } | null)
    ?.rate_confirm_guest_pin_hash;

  if (pinHash && verifyGuestPin(pin, pinHash)) {
    clearPinRateLimit(rateKey);
    try {
      const token = signGuestSession({ hotelId: DEFAULT_HOTEL_ID });
      const response = NextResponse.json({ ok: true, via: 'static' });
      response.cookies.set(RC_GUEST_COOKIE, token, guestCookieOptions());
      return response;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '세션 발급에 실패했습니다.';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'PIN이 올바르지 않거나 만료되었습니다.' }, { status: 401 });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(RC_GUEST_COOKIE, '', guestCookieOptions(0));
  return response;
}
