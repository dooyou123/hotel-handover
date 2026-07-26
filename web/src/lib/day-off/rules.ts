import {
  DAY_OFF_ACTIVE_STATUSES,
  DAY_OFF_MAX_SHIFT_DAYS,
  dateToMonthKey,
  isDayOffShiftGroup,
  normalizeRequestKind,
  type DayOffBlockedDate,
  type DayOffDateInput,
  type DayOffKind,
  type DayOffRequest,
  type DayOffShiftGroup,
  type DayOffStatus,
  type DayOffWindow,
} from '@/lib/day-off/types';

export type WindowState = 'missing' | 'scheduled' | 'open' | 'closed';

export function getWindowState(window: DayOffWindow | null, now = new Date()): WindowState {
  if (!window) return 'missing';
  const opens = new Date(window.opens_at).getTime();
  const closes = new Date(window.closes_at).getTime();
  const t = now.getTime();
  if (Number.isNaN(opens) || Number.isNaN(closes)) return 'missing';
  if (t < opens) return 'scheduled';
  if (t > closes) return 'closed';
  return 'open';
}

export function windowLockMessage(window: DayOffWindow | null, now = new Date()): string | null {
  const state = getWindowState(window, now);
  if (state === 'missing') return '아직 관리자가 이 달의 휴무 신청을 열지 않았습니다.';
  if (state === 'scheduled') {
    const opens = new Date(window!.opens_at).toLocaleString('ko-KR');
    return `신청 기간이 아직 시작되지 않았습니다. (${opens}부터)`;
  }
  if (state === 'closed') {
    const closes = new Date(window!.closes_at).toLocaleString('ko-KR');
    return `신청 기간이 마감되었습니다. (${closes}까지)`;
  }
  if (window && !window.published) {
    return '관리자가 아직 신청 링크를 공개하지 않았습니다.';
  }
  return null;
}

export function isActiveStatus(status: DayOffStatus): boolean {
  return DAY_OFF_ACTIVE_STATUSES.includes(status);
}

export function isOffRequest(
  row: Pick<DayOffRequest, 'kind'> | { kind?: string | null },
): boolean {
  return normalizeRequestKind(row.kind) === 'off';
}

export function countByDate(
  requests: Pick<DayOffRequest, 'date' | 'status' | 'employee_name' | 'kind'>[],
  excludeEmployee?: string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of requests) {
    if (!isOffRequest(row)) continue;
    if (!isActiveStatus(row.status)) continue;
    if (excludeEmployee && row.employee_name === excludeEmployee) continue;
    map.set(row.date, (map.get(row.date) ?? 0) + 1);
  }
  return map;
}

export function blockedDateMap(blocked: DayOffBlockedDate[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of blocked) {
    map.set(row.date, row.label || '신청 불가');
  }
  return map;
}

export type EvaluateDateResult =
  | { ok: true; status: 'confirmed'; isException: false; reason: '' }
  | { ok: true; status: 'pending'; isException: true; reason: string; needsReason: true }
  | { ok: false; error: string };

export function evaluateDateSelection(input: {
  date: string;
  reason?: string;
  monthKey: string;
  window: DayOffWindow;
  blocked: Map<string, string>;
  /** 본인 제외 해당일 활성 휴무 신청 수 */
  otherCountOnDate: number;
  /** 이번 선택에서 이 날짜의 순번(1부터). 상한 초과분 판정에 사용 */
  personalIndex: number;
}): EvaluateDateResult {
  const { date, reason, monthKey, window, blocked } = input;

  if (dateToMonthKey(date) !== monthKey) {
    return { ok: false, error: `${date}: 대상 월이 아닙니다.` };
  }
  if (blocked.has(date)) {
    return { ok: false, error: `${date}: ${blocked.get(date) || '신청할 수 없는 날입니다.'}` };
  }

  const overCapacity = input.otherCountOnDate >= window.max_people_per_day;
  const overPersonal = input.personalIndex > window.max_days_per_person;
  const needsException = overCapacity || overPersonal;

  if (!needsException) {
    return { ok: true, status: 'confirmed', isException: false, reason: '' };
  }

  const trimmed = (reason ?? '').trim();
  if (!trimmed) {
    const why: string[] = [];
    if (overCapacity) why.push(`하루 정원(${window.max_people_per_day}명) 초과`);
    if (overPersonal) why.push(`개인 상한(${window.max_days_per_person}일) 초과`);
    return {
      ok: false,
      error: `${date}: ${why.join(' · ')} — 특별한 사유를 입력해 주세요.`,
    };
  }

  return { ok: true, status: 'pending', isException: true, reason: trimmed, needsReason: true };
}

export type ValidatedSaveRow = {
  date: string;
  kind: DayOffKind;
  shift_group: DayOffShiftGroup | null;
  reason: string;
  is_exception: boolean;
  status: DayOffStatus;
};

export function validateSaveDates(input: {
  dates: DayOffDateInput[];
  monthKey: string;
  window: DayOffWindow;
  blocked: DayOffBlockedDate[];
  /** 타인의 활성 신청만 (본인 제외) */
  otherRequests: Pick<DayOffRequest, 'date' | 'status' | 'employee_name' | 'kind'>[];
}): { ok: true; rows: ValidatedSaveRow[] } | { ok: false; error: string } {
  const blocked = blockedDateMap(input.blocked);
  const otherCounts = countByDate(input.otherRequests);
  const unique = new Map<string, DayOffDateInput>();

  for (const item of input.dates) {
    const date = item.date?.trim();
    if (!date) continue;
    unique.set(date, {
      date,
      kind: normalizeRequestKind(item.kind),
      shift_group: item.shift_group ?? null,
      reason: item.reason,
    });
  }

  const selected = [...unique.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (selected.length === 0) {
    return { ok: false, error: '신청할 날짜를 선택해 주세요.' };
  }

  const offs = selected.filter((item) => normalizeRequestKind(item.kind) === 'off');
  const shifts = selected.filter((item) => normalizeRequestKind(item.kind) === 'shift');

  if (shifts.length > DAY_OFF_MAX_SHIFT_DAYS) {
    return {
      ok: false,
      error: `조 가능일(A/B/C)은 최대 ${DAY_OFF_MAX_SHIFT_DAYS}일까지만 지정할 수 있습니다.`,
    };
  }

  const rows: ValidatedSaveRow[] = [];

  for (const item of shifts) {
    if (dateToMonthKey(item.date) !== input.monthKey) {
      return { ok: false, error: `${item.date}: 대상 월이 아닙니다.` };
    }
    if (blocked.has(item.date)) {
      return { ok: false, error: `${item.date}: ${blocked.get(item.date) || '신청할 수 없는 날입니다.'}` };
    }
    if (!isDayOffShiftGroup(item.shift_group)) {
      return { ok: false, error: `${item.date}: A/B/C 중 가능한 조를 선택해 주세요.` };
    }
    rows.push({
      date: item.date,
      kind: 'shift',
      shift_group: item.shift_group,
      reason: '',
      is_exception: false,
      status: 'confirmed',
    });
  }

  const offsSorted = [...offs].sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 0; i < offsSorted.length; i += 1) {
    const item = offsSorted[i]!;
    const result = evaluateDateSelection({
      date: item.date,
      reason: item.reason,
      monthKey: input.monthKey,
      window: input.window,
      blocked,
      otherCountOnDate: otherCounts.get(item.date) ?? 0,
      personalIndex: i + 1,
    });
    if (!result.ok) return { ok: false, error: result.error };
    rows.push({
      date: item.date,
      kind: 'off',
      shift_group: null,
      reason: result.reason,
      is_exception: result.isException,
      status: result.status,
    });
  }

  rows.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
  return { ok: true, rows };
}

export function formatDayCount(count: number, max: number): string {
  return `${count}/${max}`;
}

export function selectionFingerprint(
  items: Array<{ date: string; kind: DayOffKind; shift_group?: DayOffShiftGroup | null; reason?: string }>,
): string {
  return items
    .map((item) => {
      const kind = normalizeRequestKind(item.kind);
      const reason = (item.reason ?? '').trim();
      const shift = kind === 'shift' ? item.shift_group ?? '' : '';
      return `${item.date}|${kind}|${shift}|${reason}`;
    })
    .sort()
    .join(';');
}

export function requestsToSelection(requests: DayOffRequest[]) {
  return requests.map((row) => ({
    date: row.date,
    kind: normalizeRequestKind(row.kind),
    shift_group: row.shift_group,
    reason: row.reason || '',
  }));
}
