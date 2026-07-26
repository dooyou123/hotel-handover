import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { DAY_OFF_COOKIE, verifyDayOffSession } from '@/lib/day-off/access';
import { getWindowState, validateSaveDates, windowLockMessage } from '@/lib/day-off/rules';
import {
  isValidMonthKey,
  type DayOffBlockedDate,
  type DayOffDateInput,
  type DayOffRequest,
  type DayOffWindow,
} from '@/lib/day-off/types';
import { hashDayOffPin, validateDayOffPin, verifyDayOffPin } from '@/lib/day-off/voter-pin';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';

type Body = {
  action?: 'status' | 'unlock' | 'save' | 'clear';
  employee_name?: string;
  pin?: string;
  pin_confirm?: string;
  new_pin?: string;
  month_key?: string;
  dates?: DayOffDateInput[];
  date?: string;
};

function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function requireAccess(request: NextRequest) {
  const token = request.cookies.get(DAY_OFF_COOKIE)?.value;
  const session = verifyDayOffSession(token);
  if (!session) return null;
  return session;
}

export async function POST(request: NextRequest) {
  if (!requireAccess(request)) return badRequest('입장 비밀번호가 필요합니다.', 401);
  if (!hasServiceRoleKey()) return badRequest('서버에 SUPABASE_SERVICE_ROLE_KEY가 없습니다.', 503);

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.action) return badRequest('action이 필요합니다.');

  const employee = body.employee_name?.trim() ?? '';
  if (!employee) return badRequest('직원 이름을 선택해 주세요.');

  const monthKey = body.month_key?.trim() ?? '';
  if (!isValidMonthKey(monthKey)) return badRequest('month_key가 필요합니다. (YYYY-MM)');

  const service = createServiceClient();

  const { data: pinRow } = await service
    .from('day_off_voter_pins')
    .select('pin_hash')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('employee_name', employee)
    .maybeSingle();

  const storedHash = (pinRow as { pin_hash?: string } | null)?.pin_hash ?? null;

  const { data: myRows, error: myError } = await service
    .from('day_off_requests')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('month_key', monthKey)
    .eq('employee_name', employee)
    .order('date');
  if (myError) return badRequest(myError.message, 500);

  const myRequests = (myRows ?? []) as DayOffRequest[];
  const hasRequests = myRequests.length > 0;
  const hasPin = Boolean(storedHash);

  if (body.action === 'status') {
    return NextResponse.json({ hasRequests, hasPin, protected: hasRequests && hasPin });
  }

  if (body.action === 'unlock') {
    if (!hasRequests) return badRequest('저장된 신청이 없습니다.');
    if (!hasPin) {
      return NextResponse.json({
        unlocked: true,
        legacy: true,
        message: '비밀번호가 없던 신청입니다. 저장할 때 새 비밀번호를 설정해 주세요.',
        requests: myRequests,
      });
    }
    if (!verifyDayOffPin(body.pin ?? '', storedHash)) {
      return badRequest('비밀번호가 올바르지 않습니다.', 403);
    }
    return NextResponse.json({ unlocked: true, legacy: false, requests: myRequests });
  }

  if (body.action === 'clear') {
    if (!hasRequests) return badRequest('삭제할 신청이 없습니다.');
    if (hasPin && !verifyDayOffPin(body.pin ?? '', storedHash)) {
      return badRequest('비밀번호가 올바르지 않습니다.', 403);
    }
    if (!hasPin) {
      return badRequest('비밀번호가 없는 이전 신청입니다. 먼저 비밀번호를 설정·저장한 뒤 삭제해 주세요.');
    }

    let query = service
      .from('day_off_requests')
      .delete()
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('month_key', monthKey)
      .eq('employee_name', employee);

    const date = body.date?.trim();
    if (date) query = query.eq('date', date);

    const { error } = await query;
    if (error) return badRequest(error.message, 500);

    if (!date) {
      await service
        .from('day_off_voter_pins')
        .delete()
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .eq('employee_name', employee);
    }

    return NextResponse.json({ ok: true });
  }

  if (body.action === 'save') {
    const { data: windowRow, error: windowError } = await service
      .from('day_off_windows')
      .select('*')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('month_key', monthKey)
      .maybeSingle();
    if (windowError) return badRequest(windowError.message, 500);

    const window = (windowRow as DayOffWindow | null) ?? null;
    const lock = windowLockMessage(window);
    if (lock || getWindowState(window) !== 'open' || !window?.published) {
      return badRequest(lock || '지금은 신청할 수 없습니다.');
    }

    const pin = body.pin ?? '';
    if (hasPin) {
      if (!verifyDayOffPin(pin, storedHash)) {
        return badRequest('비밀번호가 올바르지 않습니다.', 403);
      }
      if (body.new_pin) {
        const invalid = validateDayOffPin(body.new_pin);
        if (invalid) return badRequest(invalid);
        const { error: pinError } = await service.from('day_off_voter_pins').upsert(
          {
            hotel_id: DEFAULT_HOTEL_ID,
            employee_name: employee,
            pin_hash: hashDayOffPin(body.new_pin),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'hotel_id,employee_name' },
        );
        if (pinError) return badRequest(pinError.message, 500);
      }
    } else {
      const invalid = validateDayOffPin(pin);
      if (invalid) return badRequest(invalid);
      if (body.pin_confirm !== undefined && body.pin_confirm !== pin) {
        return badRequest('비밀번호 확인이 일치하지 않습니다.');
      }
      const { error: pinError } = await service.from('day_off_voter_pins').upsert(
        {
          hotel_id: DEFAULT_HOTEL_ID,
          employee_name: employee,
          pin_hash: hashDayOffPin(pin),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'hotel_id,employee_name' },
      );
      if (pinError) return badRequest(pinError.message, 500);
    }

    const { data: blockedRows, error: blockedError } = await service
      .from('day_off_blocked_dates')
      .select('*')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('month_key', monthKey);
    if (blockedError) return badRequest(blockedError.message, 500);

    const { data: otherRows, error: otherError } = await service
      .from('day_off_requests')
      .select('date, status, employee_name, kind')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('month_key', monthKey)
      .neq('employee_name', employee);
    if (otherError) return badRequest(otherError.message, 500);

    const validated = validateSaveDates({
      dates: body.dates ?? [],
      monthKey,
      window,
      blocked: (blockedRows ?? []) as DayOffBlockedDate[],
      otherRequests: (otherRows ?? []) as Pick<
        DayOffRequest,
        'date' | 'status' | 'employee_name' | 'kind'
      >[],
    });
    if (!validated.ok) return badRequest(validated.error);

    const { error: deleteError } = await service
      .from('day_off_requests')
      .delete()
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('month_key', monthKey)
      .eq('employee_name', employee);
    if (deleteError) return badRequest(deleteError.message, 500);

    const now = new Date().toISOString();
    const insertRows = validated.rows.map((row) => ({
      hotel_id: DEFAULT_HOTEL_ID,
      month_key: monthKey,
      employee_name: employee,
      date: row.date,
      kind: row.kind,
      shift_group: row.shift_group,
      reason: row.reason,
      is_exception: row.is_exception,
      status: row.status,
      admin_memo: '',
      reviewed_by: null,
      reviewed_at: null,
      created_at: now,
      updated_at: now,
    }));

    const { data: saved, error: insertError } = await service
      .from('day_off_requests')
      .insert(insertRows)
      .select('*')
      .order('date');
    if (insertError) return badRequest(insertError.message, 500);

    return NextResponse.json({ ok: true, requests: (saved ?? []) as DayOffRequest[] });
  }

  return badRequest('알 수 없는 action입니다.');
}
