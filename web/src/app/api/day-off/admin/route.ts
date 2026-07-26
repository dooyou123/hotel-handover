import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { hashAccessPin, isValidAccessPinPlain } from '@/lib/day-off/access';
import { countByDate } from '@/lib/day-off/rules';
import {
  DEFAULT_DAY_OFF_NOTES,
  dateToMonthKey,
  isValidMonthKey,
  type DayOffBlockedDate,
  type DayOffRequest,
  type DayOffWindow,
} from '@/lib/day-off/types';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';

type AdminBody = {
  action?: 'setPassword' | 'saveWindow' | 'setBlockedDates' | 'approve' | 'reject';
  pin?: string;
  clear?: boolean;
  month_key?: string;
  opens_at?: string;
  closes_at?: string;
  max_days_per_person?: number;
  max_people_per_day?: number;
  published?: boolean;
  notes?: string;
  dates?: Array<{ date: string; label?: string }>;
  request_id?: string;
  memo?: string;
};

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
      response: NextResponse.json({ error: '관리자만 휴무 신청을 설정할 수 있습니다.' }, { status: 403 }),
    };
  }
  return { ok: true as const, userId: user.id };
}

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function GET(request: NextRequest) {
  const gate = await requireManager();
  if (!gate.ok) return gate.response;
  if (!hasServiceRoleKey()) return badRequest('서버에 SUPABASE_SERVICE_ROLE_KEY가 없습니다.', 503);

  const month = request.nextUrl.searchParams.get('month')?.trim() ?? '';
  if (!isValidMonthKey(month)) return badRequest('month 파라미터가 필요합니다. (YYYY-MM)');

  const service = createServiceClient();
  const [
    { data: settings, error: settingsError },
    { data: windowRow, error: windowError },
    { data: blockedRows, error: blockedError },
    { data: requestRows, error: requestError },
    { data: staffRows, error: staffError },
  ] = await Promise.all([
    service.from('day_off_settings').select('access_pin_hash, updated_at').eq('hotel_id', DEFAULT_HOTEL_ID).maybeSingle(),
    service.from('day_off_windows').select('*').eq('hotel_id', DEFAULT_HOTEL_ID).eq('month_key', month).maybeSingle(),
    service
      .from('day_off_blocked_dates')
      .select('*')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('month_key', month)
      .order('date'),
    service
      .from('day_off_requests')
      .select('*')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('month_key', month)
      .order('date')
      .order('employee_name'),
    service
      .from('staff')
      .select('name')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('is_active', true)
      .order('sort_order')
      .order('name'),
  ]);

  if (settingsError) return badRequest(settingsError.message, 500);
  if (windowError) return badRequest(windowError.message, 500);
  if (blockedError) return badRequest(blockedError.message, 500);
  if (requestError) return badRequest(requestError.message, 500);
  if (staffError) return badRequest(staffError.message, 500);

  const requests = (requestRows ?? []) as DayOffRequest[];
  const countMap = countByDate(requests);

  return NextResponse.json({
    passwordConfigured: Boolean((settings as { access_pin_hash?: string | null } | null)?.access_pin_hash),
    passwordUpdatedAt: (settings as { updated_at?: string | null } | null)?.updated_at ?? null,
    window: (windowRow as DayOffWindow | null) ?? null,
    blockedDates: (blockedRows ?? []) as DayOffBlockedDate[],
    requests,
    dayCounts: [...countMap.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    staffNames: ((staffRows ?? []) as Array<{ name: string }>).map((s) => s.name),
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireManager();
  if (!gate.ok) return gate.response;
  if (!hasServiceRoleKey()) return badRequest('서버에 SUPABASE_SERVICE_ROLE_KEY가 없습니다.', 503);

  const body = (await request.json().catch(() => null)) as AdminBody | null;
  if (!body?.action) return badRequest('action이 필요합니다.');

  const service = createServiceClient();
  const now = new Date().toISOString();

  if (body.action === 'setPassword') {
    if (body.clear) {
      const { error } = await service.from('day_off_settings').upsert(
        {
          hotel_id: DEFAULT_HOTEL_ID,
          access_pin_hash: null,
          updated_at: now,
          updated_by: gate.userId,
        },
        { onConflict: 'hotel_id' },
      );
      if (error) return badRequest(error.message, 500);
      return NextResponse.json({ ok: true, configured: false });
    }

    const pin = body.pin?.trim() ?? '';
    if (!isValidAccessPinPlain(pin)) return badRequest('비밀번호는 4~64자여야 합니다.');
    const { error } = await service.from('day_off_settings').upsert(
      {
        hotel_id: DEFAULT_HOTEL_ID,
        access_pin_hash: hashAccessPin(pin),
        updated_at: now,
        updated_by: gate.userId,
      },
      { onConflict: 'hotel_id' },
    );
    if (error) return badRequest(error.message, 500);
    return NextResponse.json({ ok: true, configured: true });
  }

  if (body.action === 'saveWindow') {
    const monthKey = body.month_key?.trim() ?? '';
    if (!isValidMonthKey(monthKey)) return badRequest('month_key가 필요합니다.');
    if (!body.opens_at || !body.closes_at) return badRequest('신청 시작·종료 시각이 필요합니다.');
    const opens = new Date(body.opens_at);
    const closes = new Date(body.closes_at);
    if (Number.isNaN(opens.getTime()) || Number.isNaN(closes.getTime()) || closes <= opens) {
      return badRequest('신청 기간이 올바르지 않습니다.');
    }
    const maxDays = Number(body.max_days_per_person);
    const maxPeople = Number(body.max_people_per_day);
    if (!Number.isInteger(maxDays) || maxDays < 1 || maxDays > 31) {
      return badRequest('개인당 상한은 1~31일입니다.');
    }
    if (!Number.isInteger(maxPeople) || maxPeople < 1 || maxPeople > 50) {
      return badRequest('하루 정원은 1~50명입니다.');
    }

    const { error } = await service.from('day_off_windows').upsert(
      {
        hotel_id: DEFAULT_HOTEL_ID,
        month_key: monthKey,
        opens_at: opens.toISOString(),
        closes_at: closes.toISOString(),
        max_days_per_person: maxDays,
        max_people_per_day: maxPeople,
        published: Boolean(body.published),
        notes: (body.notes ?? '').trim() || DEFAULT_DAY_OFF_NOTES,        updated_at: now,
        updated_by: gate.userId,
      },
      { onConflict: 'hotel_id,month_key' },
    );
    if (error) return badRequest(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'setBlockedDates') {
    const monthKey = body.month_key?.trim() ?? '';
    if (!isValidMonthKey(monthKey)) return badRequest('month_key가 필요합니다.');

    const dates = (body.dates ?? [])
      .map((item) => ({
        date: item.date?.trim() ?? '',
        label: (item.label ?? '').trim(),
      }))
      .filter((item) => item.date && dateToMonthKey(item.date) === monthKey);

    const { error: deleteError } = await service
      .from('day_off_blocked_dates')
      .delete()
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('month_key', monthKey);
    if (deleteError) return badRequest(deleteError.message, 500);

    if (dates.length > 0) {
      const { error } = await service.from('day_off_blocked_dates').insert(
        dates.map((item) => ({
          hotel_id: DEFAULT_HOTEL_ID,
          date: item.date,
          month_key: monthKey,
          label: item.label || '신청 불가',
        })),
      );
      if (error) return badRequest(error.message, 500);
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'approve' || body.action === 'reject') {
    const requestId = body.request_id?.trim() ?? '';
    if (!requestId) return badRequest('request_id가 필요합니다.');

    const { data: row, error: fetchError } = await service
      .from('day_off_requests')
      .select('*')
      .eq('id', requestId)
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .maybeSingle();
    if (fetchError) return badRequest(fetchError.message, 500);
    if (!row) return badRequest('신청을 찾을 수 없습니다.', 404);

    const current = row as DayOffRequest;
    if (current.status !== 'pending') {
      return badRequest('대기 중인 신청만 승인/반려할 수 있습니다.');
    }

    const { error } = await service
      .from('day_off_requests')
      .update({
        status: body.action === 'approve' ? 'approved' : 'rejected',
        admin_memo: (body.memo ?? '').trim(),
        reviewed_by: gate.userId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', requestId)
      .eq('hotel_id', DEFAULT_HOTEL_ID);
    if (error) return badRequest(error.message, 500);
    return NextResponse.json({ ok: true });
  }

  return badRequest('알 수 없는 action입니다.');
}
