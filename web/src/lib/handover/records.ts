export type HandoverRecordsTab = 'shift' | 'activity';

export type ShiftHandoverFilters = {
  /** true면 오늘 work_date만 (workDate가 있으면 무시) */
  todayOnly: boolean;
  workDate: string;
  shift: string;
  query: string;
};

export const SHIFT_HANDOVER_SHIFT_OPTIONS = [
  { value: 'all', label: '전체 교대' },
  { value: '주간', label: '주간' },
  { value: '오후', label: '오후' },
  { value: '야간', label: '야간' },
] as const;

export function defaultShiftHandoverFilters(): ShiftHandoverFilters {
  return { todayOnly: true, workDate: '', shift: 'all', query: '' };
}
