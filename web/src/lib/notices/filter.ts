import { SHIFTS } from '@/lib/constants';
import { filterNoticesByChannel, type NoticeChannelId } from '@/lib/notices/channels';
import { isNoticeExpiringSoon } from '@/lib/notices/expiry';
import type { Notice } from '@/lib/handover/types';

export type NoticeShiftFilter = 'all' | (typeof SHIFTS)[number] | '관리자' | 'other';

export const NOTICE_SHIFT_FILTERS: { id: NoticeShiftFilter; label: string }[] = [
  { id: 'all', label: '전체 교대' },
  { id: '주간', label: '주간' },
  { id: '오후', label: '오후' },
  { id: '야간', label: '야간' },
  { id: '관리자', label: '관리자' },
  { id: 'other', label: '기타' },
];

export const NOTICE_EXPIRY_FILTERS: { id: NoticeExpiryFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'renewal', label: '만료 임박 7일' },
];

export type NoticeBoardView = 'list' | 'table';
export type NoticeExpiryFilter = 'all' | 'renewal';

export function filterNoticesForBoard(
  notices: Notice[],
  options: {
    channelId: NoticeChannelId;
    searchQuery: string;
    shiftFilter: NoticeShiftFilter;
    expiryFilter?: NoticeExpiryFilter;
  },
): Notice[] {
  let result = filterNoticesByChannel(notices, options.channelId);

  if (options.expiryFilter === 'renewal') {
    result = result.filter((notice) => isNoticeExpiringSoon(notice, 7));
  }

  const query = options.searchQuery.trim().toLowerCase();
  if (query) {
    result = result.filter(
      (notice) =>
        notice.content.toLowerCase().includes(query) ||
        notice.author.toLowerCase().includes(query) ||
        notice.type.toLowerCase().includes(query),
    );
  }

  if (options.shiftFilter !== 'all') {
    if (options.shiftFilter === 'other') {
      const known = new Set<string>([...SHIFTS, '관리자']);
      result = result.filter((notice) => !known.has(notice.author));
    } else {
      result = result.filter((notice) => notice.author === options.shiftFilter);
    }
  }

  return [...result].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at);
  });
}
