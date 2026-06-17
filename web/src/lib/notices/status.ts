import { todayDateString } from '@/lib/handover/shift-summary';
import type { Notice } from '@/lib/handover/types';

export function isNoticeCompleted(notice: Pick<Notice, 'completed_at'>): boolean {
  return Boolean(notice.completed_at);
}

export function isNoticeExpired(
  notice: Pick<Notice, 'expires_at'>,
  today = todayDateString(),
): boolean {
  if (!notice.expires_at) return false;
  return notice.expires_at < today;
}

/** 티커·인계 요약 등 활성 피드에 노출할 공지 */
export function isNoticeActiveForFeed(notice: Notice, today = todayDateString()): boolean {
  if (isNoticeCompleted(notice)) return false;
  if (isNoticeExpired(notice, today)) return false;
  return true;
}

export function filterNoticesForFeed(notices: Notice[], today = todayDateString()): Notice[] {
  return notices.filter((notice) => isNoticeActiveForFeed(notice, today));
}
