import { APP_NAV } from '@/lib/constants';

type NavHref = (typeof APP_NAV)[number]['href'];

/**
 * 사이드바 NEW 배지 — 표시 종료일(포함, YYYY-MM-DD).
 * 새 메뉴를 올릴 때 여기에 한 줄 추가하면 약 1개월간 표시된다.
 */
export const NAV_NEW_UNTIL: Partial<Record<NavHref, string>> = {
  '/procurement': '2026-11-16',
};

function todayYmd(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isNavItemNew(href: string, now = new Date()): boolean {
  const until = NAV_NEW_UNTIL[href as NavHref];
  if (!until) return false;
  return todayYmd(now) <= until;
}
