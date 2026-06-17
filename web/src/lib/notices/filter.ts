import { isNoticeCompleted } from '@/lib/notices/status';
import type { Notice } from '@/lib/handover/types';

export type NoticeBoardTab = 'announcement' | 'change' | 'completed';

export const NOTICE_BOARD_TABS: { id: NoticeBoardTab; label: string }[] = [
  { id: 'announcement', label: '공지' },
  { id: 'change', label: '변경' },
  { id: 'completed', label: '완료' },
];

export type NoticeBoardView = 'list' | 'table';

export function isNoticeBoardTab(value: string | null): value is NoticeBoardTab {
  return value === 'announcement' || value === 'change' || value === 'completed';
}

export function parseNoticeBoardTab(channelParam: string | null): NoticeBoardTab {
  if (isNoticeBoardTab(channelParam)) return channelParam;
  return 'announcement';
}

export function filterNoticesForBoard(
  notices: Notice[],
  options: {
    tab: NoticeBoardTab;
    searchQuery: string;
  },
): Notice[] {
  let result =
    options.tab === 'completed'
      ? notices.filter(isNoticeCompleted)
      : notices.filter((notice) => notice.type === options.tab && !isNoticeCompleted(notice));

  const query = options.searchQuery.trim().toLowerCase();
  if (query) {
    result = result.filter(
      (notice) =>
        notice.content.toLowerCase().includes(query) ||
        notice.author.toLowerCase().includes(query) ||
        notice.type.toLowerCase().includes(query),
    );
  }

  return [...result].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at);
  });
}

export function countNoticesForBoardTab(notices: Notice[], tab: NoticeBoardTab): number {
  if (tab === 'completed') return notices.filter(isNoticeCompleted).length;
  return notices.filter((notice) => notice.type === tab && !isNoticeCompleted(notice)).length;
}
