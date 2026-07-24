import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import {
  hashGuestPin,
  isValidGuestEmail,
  isValidGuestPinPlain,
  normalizeGuestEmail,
  parseGuestEmailAllowlist,
} from '@/lib/rate-confirm/guest-auth';
import { isResendConfigComplete, maskResendApiKey } from '@/lib/rate-confirm/guest-mail';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';

async function requireManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 }) };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, hotel_id, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    return { ok: false as const, response: NextResponse.json({ error: error.message }, { status: 500 }) };
  }
  if (!profile?.is_active || profile.hotel_id !== DEFAULT_HOTEL_ID) {
    return { ok: false as const, response: NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 }) };
  }
  if (profile.role !== 'manager') {
    return {
      ok: false as const,
      response: NextResponse.json({ error: '관리자만 게스트 설정을 변경할 수 있습니다.' }, { status: 403 }),
    };
  }
  return { ok: true as const };
}

export async function GET() {
  const gate = await requireManager();
  if (!gate.ok) return gate.response;

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' },
      { status: 503 },
    );
  }

  const supabase = createServiceClient();
  const [{ data, error }, { data: mail, error: mailError }] = await Promise.all([
    supabase
      .from('hotels')
      .select('rate_confirm_guest_pin_hash, rate_confirm_guest_pin_updated_at, rate_confirm_guest_emails')
      .eq('id', DEFAULT_HOTEL_ID)
      .maybeSingle(),
    supabase
      .from('rate_confirm_mail_settings')
      .select('resend_api_key, resend_from_email, updated_at')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .maybeSingle(),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (mailError) {
    return NextResponse.json({ error: mailError.message }, { status: 500 });
  }

  const row = data as {
    rate_confirm_guest_pin_hash?: string | null;
    rate_confirm_guest_pin_updated_at?: string | null;
    rate_confirm_guest_emails?: unknown;
  } | null;

  const mailRow = mail as {
    resend_api_key?: string | null;
    resend_from_email?: string | null;
    updated_at?: string | null;
  } | null;

  const apiKey = mailRow?.resend_api_key?.trim() ?? '';
  const fromEmail = mailRow?.resend_from_email?.trim() ?? '';

  return NextResponse.json({
    configured: Boolean(row?.rate_confirm_guest_pin_hash),
    updatedAt: row?.rate_confirm_guest_pin_updated_at ?? null,
    emails: parseGuestEmailAllowlist(row?.rate_confirm_guest_emails),
    mailConfigured: isResendConfigComplete({ apiKey, fromEmail }),
    mailFromEmail: fromEmail || null,
    mailApiKeyMasked: maskResendApiKey(apiKey),
    mailUpdatedAt: mailRow?.updated_at ?? null,
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireManager();
  if (!gate.ok) return gate.response;

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' },
      { status: 503 },
    );
  }

  let body: {
    pin?: string;
    clear?: boolean;
    emails?: string[];
    addEmail?: string;
    removeEmail?: string;
    resendApiKey?: string;
    resendFromEmail?: string;
    clearMail?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (body.clearMail) {
    const { error } = await supabase.from('rate_confirm_mail_settings').upsert({
      hotel_id: DEFAULT_HOTEL_ID,
      resend_api_key: null,
      resend_from_email: null,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      mailConfigured: false,
      mailFromEmail: null,
      mailApiKeyMasked: null,
    });
  }

  if (body.resendApiKey !== undefined || body.resendFromEmail !== undefined) {
    const { data: current, error: readError } = await supabase
      .from('rate_confirm_mail_settings')
      .select('resend_api_key, resend_from_email')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .maybeSingle();
    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    const currentRow = current as {
      resend_api_key?: string | null;
      resend_from_email?: string | null;
    } | null;

    let nextKey = currentRow?.resend_api_key?.trim() ?? '';
    let nextFrom = currentRow?.resend_from_email?.trim() ?? '';

    if (typeof body.resendApiKey === 'string') {
      const draft = body.resendApiKey.trim();
      // 빈 문자열이면 기존 키 유지 (마스킹만 보이는 상태에서 from만 수정할 때)
      if (draft) nextKey = draft;
    }
    if (typeof body.resendFromEmail === 'string') {
      nextFrom = body.resendFromEmail.trim();
    }

    if (!nextKey || !nextFrom) {
      return NextResponse.json(
        { error: 'Resend API 키와 발신 메일을 모두 입력해 주세요.' },
        { status: 400 },
      );
    }

    // Resend from: "email@domain" 또는 "Name <email@domain>"
    const fromMatch = nextFrom.match(/<([^>]+)>/);
    const fromAddress = normalizeGuestEmail(fromMatch?.[1] ?? nextFrom);
    if (!isValidGuestEmail(fromAddress)) {
      return NextResponse.json({ error: '발신 메일 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    const { error } = await supabase.from('rate_confirm_mail_settings').upsert({
      hotel_id: DEFAULT_HOTEL_ID,
      resend_api_key: nextKey,
      resend_from_email: nextFrom,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      mailConfigured: true,
      mailFromEmail: nextFrom,
      mailApiKeyMasked: maskResendApiKey(nextKey),
    });
  }

  if (body.emails || body.addEmail || body.removeEmail) {
    const { data: current, error: readError } = await supabase
      .from('hotels')
      .select('rate_confirm_guest_emails')
      .eq('id', DEFAULT_HOTEL_ID)
      .maybeSingle();
    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    let emails = parseGuestEmailAllowlist(
      (current as { rate_confirm_guest_emails?: unknown } | null)?.rate_confirm_guest_emails,
    );

    if (Array.isArray(body.emails)) {
      emails = parseGuestEmailAllowlist(body.emails);
    }
    if (body.addEmail) {
      const next = normalizeGuestEmail(body.addEmail);
      if (!isValidGuestEmail(next)) {
        return NextResponse.json({ error: '이메일 형식이 올바르지 않습니다.' }, { status: 400 });
      }
      if (!emails.includes(next)) emails = [...emails, next];
    }
    if (body.removeEmail) {
      const target = normalizeGuestEmail(body.removeEmail);
      emails = emails.filter((item) => item !== target);
    }

    const { error } = await supabase
      .from('hotels')
      .update({ rate_confirm_guest_emails: emails })
      .eq('id', DEFAULT_HOTEL_ID);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ emails });
  }

  if (body.clear) {
    const { error } = await supabase
      .from('hotels')
      .update({
        rate_confirm_guest_pin_hash: null,
        rate_confirm_guest_pin_updated_at: new Date().toISOString(),
      })
      .eq('id', DEFAULT_HOTEL_ID);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ configured: false });
  }

  const pin = body.pin?.trim() ?? '';
  if (!isValidGuestPinPlain(pin)) {
    return NextResponse.json(
      { error: 'PIN은 4~32자로 입력해 주세요.' },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from('hotels')
    .update({
      rate_confirm_guest_pin_hash: hashGuestPin(pin),
      rate_confirm_guest_pin_updated_at: new Date().toISOString(),
    })
    .eq('id', DEFAULT_HOTEL_ID);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ configured: true });
}
