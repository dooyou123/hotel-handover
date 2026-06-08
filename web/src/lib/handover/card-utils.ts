import { HIGHLIGHT_KEYWORDS } from '@/lib/handover/constants';
import type { Card, ColumnId, QuickFilter, WorkSession } from '@/lib/handover/types';

export type ProjectListSection = {
  id: 'unacked' | 'progress' | 'done' | 'archived';
  title: string;
  cards: Card[];
};

export function splitTextBySearchQuery(
  text: string,
  query: string,
): { text: string; match: boolean }[] {
  const q = query.trim();
  if (!q) return [{ text, match: false }];

  const lower = text.toLowerCase();
  const qLower = q.toLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let start = 0;
  let index = lower.indexOf(qLower);

  while (index !== -1) {
    if (index > start) {
      parts.push({ text: text.slice(start, index), match: false });
    }
    parts.push({ text: text.slice(index, index + q.length), match: true });
    start = index + q.length;
    index = lower.indexOf(qLower, start);
  }

  if (start < text.length) {
    parts.push({ text: text.slice(start), match: false });
  }

  return parts.length ? parts : [{ text, match: false }];
}

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

export function isActiveCard(card: Card): boolean {
  return card.column_id !== 'done';
}

export function isArchivedCard(card: Card): boolean {
  return card.archived_at != null;
}

export function formatArchiveTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isUrgentPriorityCard(card: Card): boolean {
  return card.priority === 'urgent' && isActiveCard(card);
}

export function isUnackedUrgentCard(card: Card): boolean {
  return isUrgentPriorityCard(card) && card.card_acknowledgments.length === 0;
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
      return isUnackedUrgentCard(card);
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

function compareCardOrder(a: Card, b: Card): number {
  return a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);
}

/** 진행중 칸: legacy urgent 칸 포함, 긴급 우선순위를 최상단 */
export function sortCardsInColumn(cards: Card[], columnId: Card['column_id']): Card[] {
  if (columnId === 'progress') {
    return cards
      .filter((card) => card.column_id === 'progress' || card.column_id === 'urgent')
      .sort((a, b) => {
        const pa = a.priority === 'urgent' ? 0 : 1;
        const pb = b.priority === 'urgent' ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return compareCardOrder(a, b);
      });
  }
  return cards.filter((card) => card.column_id === columnId).sort(compareCardOrder);
}

/** 드래그·이동 시 진행중 칸으로 정규화 */
export function normalizeColumnId(columnId: ColumnId): ColumnId {
  return columnId === 'urgent' ? 'progress' : columnId;
}

export function buildProjectListSections(cards: Card[]): ProjectListSection[] {
  const unacked = cards.filter(isUnackedUrgentCard);
  const unackedIds = new Set(unacked.map((card) => card.id));
  const progressCards = sortCardsInColumn(
    cards.filter(
      (card) =>
        !isArchivedCard(card) &&
        !unackedIds.has(card.id) &&
        (card.column_id === 'progress' || card.column_id === 'urgent'),
    ),
    'progress',
  );
  const doneCards = sortCardsInColumn(
    cards.filter((card) => !isArchivedCard(card) && card.column_id === 'done'),
    'done',
  );
  const archivedCards = cards.filter(isArchivedCard);

  const sections: ProjectListSection[] = [];
  if (unacked.length) {
    sections.push({ id: 'unacked', title: '미확인 긴급', cards: unacked });
  }
  sections.push({ id: 'progress', title: '진행중', cards: progressCards });
  sections.push({ id: 'done', title: '완료', cards: doneCards });
  if (archivedCards.length) {
    sections.push({ id: 'archived', title: '완료 보관', cards: archivedCards });
  }
  return sections;
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
