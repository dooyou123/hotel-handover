import { isCardDueSoon, isCardOverdue, isUnackedUrgentCard } from '@/lib/handover/card-utils';
import { noticeTypeShort } from '@/lib/handover/notice-utils';
import type { Card, Notice } from '@/lib/handover/types';

export type TickerItem = {
  id: string;
  label: string;
  body: string;
  tone: 'urgent' | 'warn' | 'info';
};

function cardBody(card: Card): string {
  return `${card.room ? `객실 ${card.room} · ` : ''}${card.title}`;
}

export function buildTickerItems(notices: Notice[], cards: Card[]): TickerItem[] {
  const items: TickerItem[] = [];

  for (const card of cards.filter(isUnackedUrgentCard)) {
    items.push({
      id: `unacked-${card.id}`,
      label: '미확인 긴급',
      body: cardBody(card),
      tone: 'urgent',
    });
  }

  for (const card of cards.filter(isCardOverdue)) {
    items.push({
      id: `due-overdue-${card.id}`,
      label: '마감 지남',
      body: cardBody(card),
      tone: 'urgent',
    });
  }

  for (const card of cards.filter((c) => isCardDueSoon(c) && !isCardOverdue(c))) {
    items.push({
      id: `due-soon-${card.id}`,
      label: '곧 마감',
      body: cardBody(card),
      tone: 'warn',
    });
  }

  for (const notice of notices.filter((n) => n.is_pinned)) {
    const line = notice.content.split('\n')[0]?.trim() ?? '';
    if (!line) continue;
    items.push({
      id: `notice-${notice.id}`,
      label: noticeTypeShort(notice.type),
      body: line,
      tone: notice.type === 'change' ? 'warn' : 'info',
    });
  }

  for (const card of cards.filter((c) => c.priority === 'urgent' && c.column_id !== 'done' && !isUnackedUrgentCard(c))) {
    items.push({
      id: `urgent-${card.id}`,
      label: '긴급',
      body: cardBody(card),
      tone: 'urgent',
    });
  }

  if (!items.length) {
    items.push({
      id: 'idle',
      label: '안내',
      body: '표시할 긴급 공지·인수인계가 없습니다.',
      tone: 'info',
    });
  }

  return items;
}

export function isTickerIdle(items: TickerItem[]): boolean {
  return items.length === 1 && items[0]?.id === 'idle';
}
