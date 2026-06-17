import {
  isCardDueSoon,
  isCardOverdue,
  isLongHoldCard,
  isStaleCard,
  isUnackedUrgentCard,
} from '@/lib/handover/card-utils';
import { noticeListTitle, noticeTypeShort } from '@/lib/handover/notice-utils';
import {
  filterNoticesExpiringSoon,
  formatNoticeExpiryAlertDetail,
  getNoticeExpiryUrgency,
} from '@/lib/notices/expiry';
import { filterNoticesForFeed } from '@/lib/notices/status';
import { isParcelOverdue, type Parcel } from '@/lib/parcels/types';
import type { Card, Notice } from '@/lib/handover/types';
import type { TransportBooking } from '@/lib/transport/types';
import { filterTransportNeedsInputImminent } from '@/lib/transport/alerts';
import { getTickerItemHref } from '@/lib/handover/ticker-nav';

export type LiveBoardItem = {
  id: string;
  label: string;
  body: string;
  tone: 'urgent' | 'warn' | 'info';
  href: string | null;
};

export type LiveBoardSummary = {
  id: string;
  label: string;
  count: number;
  tone: 'urgent' | 'warn' | 'info';
};

export type LiveBoardChecklist = {
  total: number;
  completed: number;
  label: string;
};

export type LiveBoardFeed = {
  summaries: LiveBoardSummary[];
  items: LiveBoardItem[];
  checklist: LiveBoardChecklist | null;
  generatedAt: string;
};

function cardBody(card: Card): string {
  return `${card.room ? `${card.room}호 · ` : ''}${card.title}`;
}

function cardHref(cardId: string, prefix: string): string | null {
  return getTickerItemHref(`${prefix}${cardId}`);
}

function noticeHref(noticeId: string, prefix = 'notice-'): string | null {
  return getTickerItemHref(`${prefix}${noticeId}`);
}

export function buildLiveBoardFeed(input: {
  notices: Notice[];
  cards: Card[];
  parcels?: Parcel[];
  transportBookings?: TransportBooking[];
  checklist?: LiveBoardChecklist | null;
}): LiveBoardFeed {
  const items: LiveBoardItem[] = [];
  const summaries: LiveBoardSummary[] = [];

  const unacked = input.cards.filter(isUnackedUrgentCard);
  const overdue = input.cards.filter(isCardOverdue);
  const dueSoon = input.cards.filter((c) => isCardDueSoon(c) && !isCardOverdue(c));
  const stale = input.cards.filter(isStaleCard);
  const holdLong = input.cards.filter(isLongHoldCard);
  const activeNotices = filterNoticesForFeed(input.notices);
  const expiringNotices = filterNoticesExpiringSoon(activeNotices, 7);
  const pinned = activeNotices.filter((n) => n.is_pinned);
  const taxiNeedsInput = filterTransportNeedsInputImminent(input.transportBookings ?? []);
  const parcelsOverdue = (input.parcels ?? []).filter((p) => isParcelOverdue(p));

  function pushSummary(id: string, label: string, count: number, tone: LiveBoardSummary['tone']) {
    if (count > 0) summaries.push({ id, label, count, tone });
  }

  pushSummary('unacked', '미확인 긴급', unacked.length, 'urgent');
  pushSummary('overdue', '마감 지남', overdue.length, 'urgent');
  pushSummary('due-soon', '곧 마감', dueSoon.length, 'warn');
  pushSummary('stale', '오래 방치', stale.length, 'warn');
  pushSummary('hold-long', '보류 오래됨', holdLong.length, 'warn');
  pushSummary('notice-expiry', '공지 만료', expiringNotices.length, 'warn');
  pushSummary('taxi-input', '택시 입력', taxiNeedsInput.length, 'urgent');
  pushSummary('parcels', '픽업 미인도', parcelsOverdue.length, 'warn');

  for (const card of unacked) {
    items.push({
      id: `unacked-${card.id}`,
      label: '미확인 긴급',
      body: cardBody(card),
      tone: 'urgent',
      href: cardHref(card.id, 'unacked-'),
    });
  }

  for (const card of overdue) {
    items.push({
      id: `due-overdue-${card.id}`,
      label: '마감 지남',
      body: cardBody(card),
      tone: 'urgent',
      href: cardHref(card.id, 'due-overdue-'),
    });
  }

  for (const card of dueSoon) {
    items.push({
      id: `due-soon-${card.id}`,
      label: '곧 마감',
      body: cardBody(card),
      tone: 'warn',
      href: cardHref(card.id, 'due-soon-'),
    });
  }

  for (const card of stale) {
    items.push({
      id: `stale-${card.id}`,
      label: '오래 방치',
      body: cardBody(card),
      tone: 'warn',
      href: cardHref(card.id, 'stale-'),
    });
  }

  for (const card of holdLong) {
    items.push({
      id: `hold-long-${card.id}`,
      label: '보류 오래됨',
      body: cardBody(card),
      tone: 'warn',
      href: cardHref(card.id, 'hold-long-'),
    });
  }

  for (const booking of taxiNeedsInput) {
    const guest = booking.booker_name || booking.guest_name;
    items.push({
      id: `taxi-${booking.id}`,
      label: '택시 입력 필요',
      body: [booking.room_number ? `${booking.room_number}호` : null, guest, booking.pickup_time.slice(0, 5)]
        .filter(Boolean)
        .join(' · '),
      tone: 'urgent',
      href: '/transport?filter=needs_input',
    });
  }

  for (const parcel of parcelsOverdue) {
    items.push({
      id: `parcel-${parcel.id}`,
      label: '픽업 장기 미인도',
      body: `${parcel.room_number ? `${parcel.room_number}호 · ` : ''}${parcel.guest_name || parcel.description || '물건'}`,
      tone: 'warn',
      href: '/parcels',
    });
  }

  for (const notice of expiringNotices) {
    const urgency = getNoticeExpiryUrgency(notice);
    items.push({
      id: `notice-expiry-${notice.id}`,
      label: urgency === 'today' ? '공지 오늘 만료' : '공지 만료 임박',
      body: `${noticeListTitle(notice.content)} · ${formatNoticeExpiryAlertDetail(notice)}`,
      tone: urgency === 'today' ? 'urgent' : 'warn',
      href: noticeHref(notice.id, 'notice-expiry-'),
    });
  }

  for (const notice of pinned) {
    const line = notice.content.split('\n')[0]?.trim() ?? '';
    if (!line) continue;
    items.push({
      id: `notice-${notice.id}`,
      label: noticeTypeShort(notice.type),
      body: line,
      tone: notice.type === 'change' ? 'warn' : 'info',
      href: noticeHref(notice.id),
    });
  }

  if (!items.length) {
    items.push({
      id: 'idle',
      label: '안내',
      body: '현재 표시할 긴급 항목이 없습니다.',
      tone: 'info',
      href: null,
    });
  }

  return {
    summaries,
    items,
    checklist: input.checklist ?? null,
    generatedAt: new Date().toISOString(),
  };
}
