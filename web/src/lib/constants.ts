export const DEFAULT_HOTEL_ID =
  process.env.NEXT_PUBLIC_DEFAULT_HOTEL_ID ?? '00000000-0000-4000-8000-000000000001';

export const SHIFTS = ['주간', '오후', '야간'] as const;

export const APP_NAV = [
  { href: '/handover', label: '인수인계' },
  { href: '/contacts', label: '연락처' },
  { href: '/checklist', label: '체크리스트' },
  { href: '/schedule', label: '스케줄' },
  { href: '/amenity', label: '어메니티' },
  { href: '/settings', label: '설정' },
] as const;

export const SESSION_STORAGE_KEY = 'handover-session';
