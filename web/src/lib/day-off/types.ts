export const DAY_OFF_STATUSES = ['confirmed', 'pending', 'approved', 'rejected'] as const;
export type DayOffStatus = (typeof DAY_OFF_STATUSES)[number];

export const DAY_OFF_STATUS_LABELS: Record<DayOffStatus, string> = {
  confirmed: '확정',
  pending: '대기',
  approved: '승인',
  rejected: '반려',
};

export const DAY_OFF_KINDS = ['off', 'shift'] as const;
export type DayOffKind = (typeof DAY_OFF_KINDS)[number];

export const DAY_OFF_SHIFT_GROUPS = ['A', 'B', 'C'] as const;
export type DayOffShiftGroup = (typeof DAY_OFF_SHIFT_GROUPS)[number];

/** 개인당 조 가능일(A/B/C 중 하루만 근무 가능) 최대 지정 수 */
export const DAY_OFF_MAX_SHIFT_DAYS = 2;

/** 관리자 안내 문구 기본값 */
export const DEFAULT_DAY_OFF_NOTES = `【휴무 신청 안내】

1. 공유 비밀번호로 입장 → 본인 이름 선택 → 개인 비밀번호를 설정합니다.
2. 달력에서 휴무를 원하는 날을 탭하세요. (개인 상한·하루 정원을 확인합니다.)
3. 상한/정원을 넘는 날은 사유를 적어야 하며, 관리자 승인 후 확정됩니다.
4. 근무는 하되 A·B·C조 중 하루만 가능한 날은 ‘조 가능일’로 표시할 수 있습니다. (최대 2일)
5. 날짜만 고르면 반영되지 않습니다. 반드시 하단 [신청 저장]을 눌러 주세요.
6. 수정·삭제도 개인 비밀번호가 필요합니다.`;

/** 정원/상한에 포함되는 상태 */
export const DAY_OFF_ACTIVE_STATUSES: DayOffStatus[] = ['confirmed', 'pending', 'approved'];

export type DayOffSettings = {
  hotel_id: string;
  access_pin_hash: string | null;
  updated_at: string;
  updated_by: string | null;
};

export type DayOffWindow = {
  hotel_id: string;
  month_key: string;
  opens_at: string;
  closes_at: string;
  max_days_per_person: number;
  max_people_per_day: number;
  published: boolean;
  notes: string;
  updated_at: string;
  updated_by: string | null;
};

export type DayOffBlockedDate = {
  hotel_id: string;
  date: string;
  month_key: string;
  label: string;
};

export type DayOffRequest = {
  id: string;
  hotel_id: string;
  month_key: string;
  employee_name: string;
  date: string;
  kind: DayOffKind;
  shift_group: DayOffShiftGroup | null;
  reason: string;
  is_exception: boolean;
  status: DayOffStatus;
  admin_memo: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DayOffDateInput = {
  date: string;
  kind?: DayOffKind;
  shift_group?: DayOffShiftGroup | null;
  reason?: string;
};

export type DayOffDayCount = {
  date: string;
  count: number;
};

export type DayOffWindowPayload = {
  window: DayOffWindow | null;
  blockedDates: DayOffBlockedDate[];
  dayCounts: DayOffDayCount[];
  staffNames: string[];
  open: boolean;
  lockMessage: string | null;
};

export function isValidMonthKey(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

export function dateToMonthKey(date: string): string {
  return date.slice(0, 7);
}

export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function nextMonthKey(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function isDayOffShiftGroup(value: unknown): value is DayOffShiftGroup {
  return value === 'A' || value === 'B' || value === 'C';
}

export function normalizeRequestKind(value: unknown): DayOffKind {
  return value === 'shift' ? 'shift' : 'off';
}
