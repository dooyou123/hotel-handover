import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { DAY_OFF_COOKIE, verifyDayOffSession } from '@/lib/day-off/access';
import { countByDate, getWindowState, windowLockMessage } from '@/lib/day-off/rules';
import {
  isValidMonthKey,
  type DayOffBlockedDate,
  type DayOffRequest,
  type DayOffWindow,
} from '@/lib/day-off/types';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';

function requireAccess(request: NextRequest) {
  const token = request.cookies.get(DAY_OFF_COOKIE)?.value;
  const session = verifyDayOffSession(token);
  if (!session) {
    return { ok: false as const, response: NextResponse.json({ error: '입장 비밀번호가 필요합니다.' }, { status: 401 }) };
  }
  return { ok: true as const, session };
}

export async function GET(request: NextRequest) {
  const gate = requireAccess(request);
  if (!gate.ok) return gate.response;

  if (!hasServiceRoleKey()) {
    return NextResponse.json({ error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 없습니다.' }, { status: 503 });
  }

  const month = request.nextUrl.searchParams.get('month')?.trim() ?? '';
  if (!isValidMonthKey(month)) {
    return NextResponse.json({ error: 'month 파라미터가 필요합니다. (YYYY-MM)' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const [{ data: windowRow, error: windowError }, { data: blockedRows, error: blockedError }, { data: requestRows, error: requestError }, { data: staffRows, error: staffError }] =
    await Promise.all([
      supabase
        .from('day_off_windows')
        .select('*')
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .eq('month_key', month)
        .maybeSingle(),
      supabase
        .from('day_off_blocked_dates')
        .select('*')
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .eq('month_key', month)
        .order('date'),
      supabase
        .from('day_off_requests')
        .select('date, status, employee_name, kind')
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .eq('month_key', month),
      supabase
        .from('staff')
        .select('name')
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .eq('is_active', true)
        .order('sort_order')
        .order('name'),
    ]);

  if (windowError) return NextResponse.json({ error: windowError.message }, { status: 500 });
  if (blockedError) return NextResponse.json({ error: blockedError.message }, { status: 500 });
  if (requestError) return NextResponse.json({ error: requestError.message }, { status: 500 });
  if (staffError) return NextResponse.json({ error: staffError.message }, { status: 500 });

  const window = (windowRow as DayOffWindow | null) ?? null;
  const blockedDates = (blockedRows ?? []) as DayOffBlockedDate[];
  const requests = (requestRows ?? []) as Pick<DayOffRequest, 'date' | 'status' | 'employee_name' | 'kind'>[];

  const countMap = countByDate(requests);
  const dayCounts = [...countMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const lockMessage = windowLockMessage(window);
  const open = getWindowState(window) === 'open' && Boolean(window?.published);

  return NextResponse.json({
    window,
    blockedDates,
    dayCounts,
    staffNames: ((staffRows ?? []) as Array<{ name: string }>).map((s) => s.name),
    open,
    lockMessage,
  });
}
