export const DEFAULT_HOTEL_ID =
  process.env.NEXT_PUBLIC_DEFAULT_HOTEL_ID ?? '00000000-0000-4000-8000-000000000001';

/** @deprecated 레거시 데이터·통계용. UI·스케줄은 WORK_GROUPS 사용 */
export const SHIFTS = ['주간', '오후', '야간'] as const;

/** 근무 조 — 체크리스트·인수인계·스케줄 그룹 */
export const WORK_GROUPS = ['A', 'B', 'C', 'D', 'E'] as const;

export type WorkGroupCode = (typeof WORK_GROUPS)[number];

/** checklist_items.work_group: common = 전 조 공통 */
export const CHECKLIST_SCOPES = ['common', 'A', 'B', 'C', 'D', 'E'] as const;
export type ChecklistScope = (typeof CHECKLIST_SCOPES)[number];

export const CHECKLIST_SCOPE_LABELS: Record<ChecklistScope, string> = {
  common: '공통',
  A: 'A조',
  B: 'B조',
  C: 'C조',
  D: 'D조',
  E: 'E조',
};

export function formatWorkGroupLabel(group: string): string {
  return group ? `${group}조` : '';
}

export function formatSessionLabel(group: string, name: string): string {
  if (!group || !name) return '';
  return `${formatWorkGroupLabel(group)} · ${name}`;
}

/** 조별 근무 시간 (루틴 템플릿·인수인계 안내) */
export const WORK_GROUP_HOURS: Record<string, string> = {
  A: '07:00~16:00',
  B: '13:00~22:00',
  C: '22:00~07:00',
};

/** Shift Check List 시트명 (오전·오후·야간) */
export const WORK_GROUP_SHIFT_NAMES: Record<string, string> = {
  A: '오전조',
  B: '오후조',
  C: '야간조',
};

export function formatShiftChecklistTitle(group: string): string {
  const name = WORK_GROUP_SHIFT_NAMES[group];
  const hours = WORK_GROUP_HOURS[group];
  if (name && hours) return `${group}조 (${name} ${hours})`;
  if (name) return `${group}조 (${name})`;
  return `${group}조`;
}

/** 컴플레인 SLA 목표 */
export const COMPLAINT_SLA_FIRST_RESPONSE_MIN = 30;
export const COMPLAINT_SLA_RESOLUTION_HOURS = 24;

export const FACILITY_CATEGORIES = ['시설', '컴플레인'] as const;

export const FEEDBACK_CATEGORIES = [
  { value: 'bug', label: '버그 · 오류' },
  { value: 'feature', label: '기능 개선' },
  { value: 'other', label: '기타 문의' },
] as const;

export const FEEDBACK_STATUS_LABELS: Record<string, string> = {
  open: '접수',
  in_progress: '처리 중',
  resolved: '해결',
  closed: '종료',
};

export const NAV_CATEGORIES = ['core', 'ops', 'insight', 'system'] as const;
export type NavCategory = (typeof NAV_CATEGORIES)[number];

export const NAV_CATEGORY_LABELS: Record<NavCategory, string> = {
  core: '업무',
  ops: '운영',
  insight: '분석',
  system: '시스템',
};

export const APP_NAV = [
  { href: '/handover', label: '인수인계', category: 'core' as const },
  { href: '/notices', label: '게시판', category: 'core' as const },
  { href: '/todos', label: '업무 일정', category: 'core' as const },
  { href: '/schedule', label: '근무표', category: 'core' as const },
  { href: '/contacts', label: '연락처', category: 'ops' as const },
  { href: '/checklist', label: '체크리스트', category: 'ops' as const },
  { href: '/housekeeping', label: '하우스키핑', category: 'ops' as const },
  { href: '/amenity', label: '어메니티', category: 'ops' as const },
  { href: '/reviews', label: '리뷰', category: 'ops' as const },
  { href: '/guest-notices', label: '고객 안내', category: 'ops' as const },
  { href: '/transport', label: '택시 예약', category: 'ops' as const },
  { href: '/facility', label: '시설 현황', category: 'ops' as const },
  { href: '/rate-confirm', label: '객실료 컨펌', category: 'ops' as const },
  { href: '/stats', label: '통계', category: 'insight' as const },
  { href: '/settings', label: '설정', category: 'system' as const },
] as const;

export const SESSION_STORAGE_KEY = 'handover-session';
