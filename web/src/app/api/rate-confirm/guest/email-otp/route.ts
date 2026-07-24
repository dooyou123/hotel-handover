import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import {
  RC_GUEST_OTP_TTL_MS,
  checkOtpSendRateLimit,
  clientIpFromRequest,
  generateGuestOtpCode,
  hashGuestOtp,
  isValidGuestEmail,
  normalizeGuestEmail,
  parseGuestEmailAllowlist,
} from '@/lib/rate-confirm/guest-auth';
import { isResendConfigComplete, sendGuestOtpEmail } from '@/lib/rate-confirm/guest-mail';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';

const GENERIC_OK =
  '허용된 메일이면 일회용 PIN을 보냈습니다. 메일함을 확인해 주세요.';

export async function POST(request: NextRequest) {
  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' },
      { status: 503 },
    );
  }

  let body: { email?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const email = normalizeGuestEmail(body.email ?? '');
  if (!isValidGuestEmail(email)) {
    return NextResponse.json({ error: '이메일 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const ip = clientIpFromRequest(request);
  const limit = checkOtpSendRateLimit(`${DEFAULT_HOTEL_ID}:${ip}:${email}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${limit.retryAfterSec}초 후 다시 시도해 주세요.` },
      { status: 429 },
    );
  }

  const supabase = createServiceClient();

  const { data: mailSettings, error: mailError } = await supabase
    .from('rate_confirm_mail_settings')
    .select('resend_api_key, resend_from_email')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .maybeSingle();

  if (mailError) {
    return NextResponse.json({ error: mailError.message }, { status: 500 });
  }

  const mailRow = mailSettings as {
    resend_api_key?: string | null;
    resend_from_email?: string | null;
  } | null;

  const mailConfig = {
    apiKey: mailRow?.resend_api_key?.trim() ?? '',
    fromEmail: mailRow?.resend_from_email?.trim() ?? '',
  };
  if (!isResendConfigComplete(mailConfig)) {
    return NextResponse.json(
      { error: '메일 발송이 설정되지 않았습니다. 관리자에게 문의하세요.' },
      { status: 503 },
    );
  }

  const { data: hotel, error } = await supabase
    .from('hotels')
    .select('rate_confirm_guest_emails')
    .eq('id', DEFAULT_HOTEL_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allowlist = parseGuestEmailAllowlist(
    (hotel as { rate_confirm_guest_emails?: unknown } | null)?.rate_confirm_guest_emails,
  );

  if (!allowlist.includes(email)) {
    // enumeration 방지: 동일 성공 메시지
    return NextResponse.json({ ok: true, message: GENERIC_OK });
  }

  const code = generateGuestOtpCode();
  const expiresAt = new Date(Date.now() + RC_GUEST_OTP_TTL_MS).toISOString();

  const { error: insertError } = await supabase.from('rate_confirm_guest_otps').insert({
    hotel_id: DEFAULT_HOTEL_ID,
    email,
    code_hash: hashGuestOtp(code),
    expires_at: expiresAt,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  try {
    await sendGuestOtpEmail({
      to: email,
      code,
      config: mailConfig,
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : '메일 발송에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, message: GENERIC_OK });
}
