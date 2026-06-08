export const DEFAULT_HOTEL_ID =
  process.env.NEXT_PUBLIC_DEFAULT_HOTEL_ID ?? '00000000-0000-4000-8000-000000000001';

export const SHIFTS = ['주간', '오후', '야간'] as const;

/** 근무 조 — 체크리스트·인수인계 그룹 (A/B/C) */
export const WORK_GROUPS = ['A', 'B', 'C'] as const;

export type WorkGroupCode = (typeof WORK_GROUPS)[number];

/** checklist_items.work_group: common = 전 조 공통 */
export const CHECKLIST_SCOPES = ['common', 'A', 'B', 'C'] as const;
export type ChecklistScope = (typeof CHECKLIST_SCOPES)[number];

export const CHECKLIST_SCOPE_LABELS: Record<ChecklistScope, string> = {
  common: '공통',
  A: 'A조',
  B: 'B조',
  C: 'C조',
};

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

export const APP_NAV = [
  { href: '/handover', label: '인수인계' },
  { href: '/contacts', label: '연락처' },
  { href: '/checklist', label: '체크리스트' },
  { href: '/schedule', label: '스케줄' },
  { href: '/housekeeping', label: '하우스키핑' },
  { href: '/amenity', label: '어메니티' },
  { href: '/reviews', label: '리뷰' },
  { href: '/stats', label: '통계' },
  { href: '/settings', label: '설정' },
] as const;

export const SESSION_STORAGE_KEY = 'handover-session';
