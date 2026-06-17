import { todayDateString } from '@/lib/handover/shift-summary';
import type { Notice } from '@/lib/handover/types';

export type NoticeExpiryUrgency = 'today' | 'soon' | 'week';

export function daysUntilNoticeExpiry(expiresAt: string, today = todayDateString()): number {
  const end = new Date(`${expiresAt}T12:00:00`);
  const start = new Date(`${today}T12:00:00`);
  if (Number.isNaN(end.getTime()) || Number.isNaN(start.getTime())) return Number.NaN;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function getNoticeExpiryUrgency(
  notice: Pick<Notice, 'expires_at'>,
  today = todayDateString(),
): NoticeExpiryUrgency | null {
  if (!notice.expires_at) return null;
  const days = daysUntilNoticeExpiry(notice.expires_at, today);
  if (Number.isNaN(days) || days < 0) return null;
  if (days === 0) return 'today';
  if (days <= 3) return 'soon';
  if (days <= 7) return 'week';
  return null;
}

export function isNoticeExpiringSoon(notice: Pick<Notice, 'expires_at'>, withinDays = 7): boolean {
  if (!notice.expires_at) return false;
  const days = daysUntilNoticeExpiry(notice.expires_at);
  return !Number.isNaN(days) && days >= 0 && days <= withinDays;
}

export function filterNoticesExpiringSoon(notices: Notice[], withinDays = 7): Notice[] {
  return notices.filter((notice) => isNoticeExpiringSoon(notice, withinDays));
}

export function formatNoticeExpiryAlertDetail(
  notice: Notice,
  today = todayDateString(),
): string {
  if (!notice.expires_at) return '';
  const days = daysUntilNoticeExpiry(notice.expires_at, today);
  if (days === 0) return '오늘 만료';
  if (days === 1) return '내일 만료';
  return `${days}일 후 만료`;
}
