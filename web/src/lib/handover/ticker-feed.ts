import { isUnackedUrgentCard } from '@/lib/handover/card-utils';
import { noticeTypeShort } from '@/lib/handover/notice-utils';
import type { Card, Notice } from '@/lib/handover/types';

export type TickerItem = {
  id: string;
  text: string;
  tone: 'urgent' | 'warn' | 'info';
};

export function buildTickerItems(notices: Notice[], cards: Card[]): TickerItem[] {
  const items: TickerItem[] = [];

  for (const card of cards.filter(isUnackedUrgentCard)) {
    items.push({
      id: `unacked-${card.id}`,
      text: `미확인 긴급 · ${card.room ? `객실 ${card.room} · ` : ''}${card.title}`,
      tone: 'urgent',
    });
  }

  for (const notice of notices.filter((n) => n.is_pinned)) {
    const line = notice.content.split('\n')[0]?.trim() ?? '';
    if (!line) continue;
    items.push({
      id: `notice-${notice.id}`,
      text: `${noticeTypeShort(notice.type)} · ${line}`,
      tone: notice.type === 'change' ? 'warn' : 'info',
    });
  }

  for (const card of cards.filter((c) => c.priority === 'urgent' && c.column_id !== 'done' && !isUnackedUrgentCard(c))) {
    items.push({
      id: `urgent-${card.id}`,
      text: `긴급 · ${card.room ? `객실 ${card.room} · ` : ''}${card.title}`,
      tone: 'urgent',
    });
  }

  if (!items.length) {
    items.push({
      id: 'idle',
      text: '표시할 긴급 공지·인수인계가 없습니다.',
      tone: 'info',
    });
  }

  return items;
}
