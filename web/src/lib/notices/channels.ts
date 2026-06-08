import type { Notice, NoticeType } from '@/lib/handover/types';

export type NoticeChannelId = 'all' | NoticeType;

export type NoticeChannel = {
  id: NoticeChannelId;
  name: string;
  description: string;
  type: NoticeType | null;
};

export const NOTICE_CHANNELS: NoticeChannel[] = [
  { id: 'all', name: '전체', description: '모든 업무 메시지', type: null },
  { id: 'announcement', name: '공지', description: '업무 공지', type: 'announcement' },
  { id: 'change', name: '변경', description: '업무 변경', type: 'change' },
];

export function isNoticeChannelId(value: string | null): value is NoticeChannelId {
  return value === 'all' || value === 'announcement' || value === 'change';
}

export function getNoticeChannel(id: NoticeChannelId): NoticeChannel {
  return NOTICE_CHANNELS.find((ch) => ch.id === id) ?? NOTICE_CHANNELS[0];
}

export function filterNoticesByChannel(notices: Notice[], channelId: NoticeChannelId): Notice[] {
  const channel = getNoticeChannel(channelId);
  if (!channel.type) return notices;
  return notices.filter((notice) => notice.type === channel.type);
}

export function sortNoticesTimeline(notices: Notice[]): Notice[] {
  return [...notices].sort((a, b) => {
    const aTime = a.created_at || a.updated_at;
    const bTime = b.created_at || b.updated_at;
    return aTime.localeCompare(bTime);
  });
}

export type NoticeDateGroup = {
  key: string;
  label: string;
  notices: Notice[];
};

export function groupNoticesByDate(notices: Notice[]): NoticeDateGroup[] {
  const sorted = sortNoticesTimeline(notices);
  const groups: NoticeDateGroup[] = [];

  for (const notice of sorted) {
    const iso = notice.created_at || notice.updated_at;
    const date = new Date(iso);
    const key = Number.isNaN(date.getTime())
      ? 'unknown'
      : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const label = formatTimelineDateLabel(iso);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.notices.push(notice);
    } else {
      groups.push({ key, label, notices: [notice] });
    }
  }

  return groups;
}

export function formatTimelineDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '날짜 없음';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

export function authorAvatarLabel(author: string): string {
  const trimmed = author.trim();
  if (!trimmed) return '?';
  if (trimmed.length <= 2) return trimmed;
  return trimmed.slice(0, 1);
}
