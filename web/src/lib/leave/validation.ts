import type { LeaveBlockedDate, LeavePolicy, LeaveRequest, LeaveRequestStatus } from '@/lib/leave/types';

export function monthFromDate(date: string): string {
  return date.slice(0, 7);
}

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function leaveCalendarWeekdays(): readonly string[] {
  return WEEKDAYS_KO;
}

export function buildLeaveCalendarCells(month: string): Array<{ key: string; day: number | null; date: string | null }> {
  const [year, mon] = month.split('-').map(Number);
  const first = new Date(year!, mon! - 1, 1);
  const lastDay = new Date(year!, mon!, 0).getDate();
  const leading = first.getDay();
  const cells: Array<{ key: string; day: number | null; date: string | null }> = [];
  for (let i = 0; i < leading; i += 1) {
    cells.push({ key: `blank-${i}`, day: null, date: null });
  }
  for (let day = 1; day <= lastDay; day += 1) {
    const date = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ key: date, day, date });
  }
  return cells;
}

export function daysInMonth(month: string): string[] {
  const [year, mon] = month.split('-').map(Number);
  const lastDay = new Date(year!, mon!, 0).getDate();
  const days: string[] = [];
  for (let day = 1; day <= lastDay; day += 1) {
    days.push(`${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  return days;
}

export function getTargetMonth(now: Date, offset: number): string {
  const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  return `${year}년 ${mon}월`;
}

export function isDateBlocked(date: string, blocked: LeaveBlockedDate[]): boolean {
  const [, month, day] = date.split('-').map(Number);
  return blocked.some((item) => item.block_month === month && item.block_day === day);
}

export function isApplicationWindowOpen(now: Date, policy: LeavePolicy): boolean {
  const day = now.getDate();
  const open = policy.application_open_day;
  const close = policy.application_close_day;
  if (open <= close) return day >= open && day <= close;
  return day >= open || day <= close;
}

export function countsTowardDailyCap(request: LeaveRequest): boolean {
  return request.status === 'approved' || request.status === 'pending_review';
}

export function requestsForDateOrdered(requests: LeaveRequest[], date: string): LeaveRequest[] {
  return requests
    .filter((request) => request.leave_date === date && countsTowardDailyCap(request))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function countStaffOffOnDate(requests: LeaveRequest[], date: string): number {
  return requestsForDateOrdered(requests, date).length;
}

export function formatLeaveAppliedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function countStaffRequestsInMonth(
  requests: LeaveRequest[],
  staffName: string,
  month: string,
): number {
  return requests.filter(
    (request) =>
      request.staff_name === staffName &&
      monthFromDate(request.leave_date) === month &&
      request.status !== 'cancelled' &&
      request.status !== 'rejected',
  ).length;
}

export type LeaveDayState = {
  date: string;
  blocked: boolean;
  blockedLabel?: string;
  dailyCount: number;
  dailyFull: boolean;
  myRequest?: LeaveRequest;
};

export function buildLeaveDayStates(
  month: string,
  requests: LeaveRequest[],
  blocked: LeaveBlockedDate[],
  policy: LeavePolicy,
  staffName: string,
): LeaveDayState[] {
  return daysInMonth(month).map((date) => {
    const block = blocked.find((item) => {
      const [, m, d] = date.split('-').map(Number);
      return item.block_month === m && item.block_day === d;
    });
    const dailyCount = countStaffOffOnDate(requests, date);
    const myRequest = requests.find(
      (request) => request.staff_name === staffName && request.leave_date === date,
    );
    return {
      date,
      blocked: Boolean(block),
      blockedLabel: block?.label,
      dailyCount,
      dailyFull: dailyCount >= policy.max_staff_per_day,
      myRequest,
    };
  });
}

export function resolveLeaveStatus(
  date: string,
  staffName: string,
  isException: boolean,
  requests: LeaveRequest[],
  policy: LeavePolicy,
  blocked: LeaveBlockedDate[],
): { ok: true; status: LeaveRequestStatus } | { ok: false; error: string } {
  if (isDateBlocked(date, blocked)) {
    const label = blocked.find((item) => {
      const [, m, d] = date.split('-').map(Number);
      return item.block_month === m && item.block_day === d;
    });
    return { ok: false, error: `${label?.label ?? '공휴일'}에는 휴무 신청이 불가합니다.` };
  }

  const month = monthFromDate(date);
  const existing = requests.find(
    (request) => request.staff_name === staffName && request.leave_date === date,
  );
  if (existing && existing.status !== 'cancelled' && existing.status !== 'rejected') {
    return { ok: false, error: '이미 신청한 날짜입니다.' };
  }

  const monthlyCount = countStaffRequestsInMonth(requests, staffName, month);
  if (monthlyCount >= policy.max_days_per_month && !isException) {
    return {
      ok: false,
      error: `한 달 최대 ${policy.max_days_per_month}일까지 신청할 수 있습니다. 특별 사유는 사전 협의를 이용해 주세요.`,
    };
  }

  if (isException) {
    return { ok: true, status: 'pending_review' };
  }

  const dailyCount = countStaffOffOnDate(
    requests.filter((request) => !(request.staff_name === staffName && request.leave_date === date)),
    date,
  );
  if (dailyCount >= policy.max_staff_per_day) {
    return {
      ok: false,
      error: `이 날짜 신청 정원이 마감되었습니다. (${policy.max_staff_per_day}명 선착순)`,
    };
  }

  return { ok: true, status: 'approved' };
}
