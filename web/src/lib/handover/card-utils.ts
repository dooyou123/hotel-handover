import { HIGHLIGHT_KEYWORDS } from '@/lib/handover/constants';
import type { Card, QuickFilter, WorkSession } from '@/lib/handover/types';

export function normalizeRoomKey(room: string): string {
  const trimmed = room.trim();
  return trimmed || '미지정';
}

export function cardHasKeyword(card: Card): boolean {
  const text = [card.title, card.details, card.next_action, card.category].join(' ').toLowerCase();
  return HIGHLIGHT_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
}

export function isCardOverdue(card: Card): boolean {
  if (!card.due_at || card.column_id === 'done') return false;
  return new Date(card.due_at).getTime() < Date.now();
}

export function getStaleLevel(card: Card): '' | 'mid' | 'high' {
  if (card.column_id === 'done') return '';
  const date = new Date(card.updated_at || card.created_at);
  if (Number.isNaN(date.getTime())) return '';
  const hours = (Date.now() - date.getTime()) / 3_600_000;
  if (hours >= 12) return 'high';
  if (hours >= 4) return 'mid';
  return '';
}

export function cardMatchesMine(card: Card, session: WorkSession): boolean {
  if (card.column_id === 'done') return false;
  const { shift, name } = session;
  if (!shift && !name) return false;
  if (card.assignee_name && name && card.assignee_name === name) return true;
  if (card.assignee_shift && shift && card.assignee_shift === shift && !card.assignee_name) return true;
  if (card.assignee_shift && shift && card.assignee_name && name) {
    return card.assignee_shift === shift && card.assignee_name === name;
  }
  return false;
}

export function matchesRoomCleanFilter(card: Card): boolean {
  if (card.column_id === 'done') return false;
  const text = [card.title, card.details, card.next_action, card.category].join(' ').toLowerCase();
  return /클린|청소|clean|dirty|룸클린|하우스키핑|hk/.test(text);
}

export function filterCards(
  cards: Card[],
  options: {
    query: string;
    quickFilter: QuickFilter;
    category: string;
    session: WorkSession;
  },
): Card[] {
  const q = options.query.trim().toLowerCase();

  return cards.filter((card) => {
    const haystack = [
      card.room,
      card.title,
      card.details,
      card.next_action,
      card.author,
      card.category,
      card.assignee_name,
      card.assignee_shift,
    ]
      .join(' ')
      .toLowerCase();

    if (q && !haystack.includes(q)) return false;

    if (options.quickFilter === 'unacked') {
      return card.column_id === 'urgent' && card.card_acknowledgments.length === 0;
    }
    if (options.quickFilter === 'mine') {
      return cardMatchesMine(card, options.session);
    }
    if (options.quickFilter === 'roomclean') {
      return matchesRoomCleanFilter(card);
    }
    if (options.quickFilter !== 'all' && options.quickFilter) {
      return card.category === options.quickFilter;
    }
    if (options.category) {
      return card.category === options.category;
    }
    return true;
  });
}

export function formatAssigneeLabel(card: Card): string {
  if (card.assignee_shift && card.assignee_name) {
    return `${card.assignee_shift} · ${card.assignee_name}`;
  }
  if (card.assignee_shift) return card.assignee_shift;
  if (card.assignee_name) return card.assignee_name;
  return '';
}

export function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatElapsed(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)}분`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간`;
  const days = Math.floor(hours / 24);
  return `${days}일`;
}

export function formatDueLabel(dueAt: string | null, overdue: boolean): string {
  if (!dueAt) return '';
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return '';
  const label = date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return overdue ? `마감 지남 · ${label}` : `마감 ${label}`;
}

export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toDateInputValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeInputValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 날짜만 있으면 23:59, 시간만 있으면 오늘 날짜와 결합 */
export function parseDueAt(dateValue: string, timeValue: string): string | null {
  const date = dateValue.trim();
  const time = timeValue.trim();
  if (!date && !time) return null;
  if (!date && time) {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const parsed = new Date(`${todayStr}T${time}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  const parsed = new Date(`${date}T${time || '23:59'}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function sortCardsInColumn(cards: Card[], columnId: Card['column_id']): Card[] {
  return cards
    .filter((card) => card.column_id === columnId)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
}

export function groupCardsByRoom(cards: Card[]): Map<string, Card[]> {
  const groups = new Map<string, Card[]>();
  cards
    .filter((card) => card.column_id !== 'done')
    .forEach((card) => {
      const key = normalizeRoomKey(card.room);
      const list = groups.get(key) ?? [];
      list.push(card);
      groups.set(key, list);
    });
  return groups;
}

export function sortRoomKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    if (a === '미지정') return 1;
    if (b === '미지정') return -1;
    return a.localeCompare(b, 'ko', { numeric: true });
  });
}
