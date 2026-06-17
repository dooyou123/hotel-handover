import { COLUMN_LABELS } from '@/lib/handover/constants';
import {
  isActiveCard,
  isArchivedCard,
  isHoldCard,
  isLongHoldCard,
  isStaleCard,
  isUnackedUrgentCard,
  isUrgentPriorityCard,
  isWorkingColumn,
} from '@/lib/handover/card-utils';
import type { ActivityLog, Card, Notice } from '@/lib/handover/types';
import { filterNoticesForFeed } from '@/lib/notices/status';

export function isToday(value: string): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function getTodayLabel(): string {
  return new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

export type ShiftSummaryData = {
  todayCards: Card[];
  todayActive: Card[];
  unackedUrgent: Card[];
  urgentActive: Card[];
  progressActive: Card[];
  holdActive: Card[];
  staleActive: Card[];
  longHoldActive: Card[];
  boardDoneCount: number;
  doneToday: Card[];
  announcements: Notice[];
  pinnedAnnouncements: Notice[];
  changes: Notice[];
};

export function buildShiftSummaryData(cards: Card[], notices: Notice[]): ShiftSummaryData {
  const todayCards = cards.filter((card) => isToday(card.created_at) || isToday(card.updated_at));
  const unackedUrgent = cards.filter(isUnackedUrgentCard);
  const urgentActive = cards.filter(isUrgentPriorityCard);
  const progressActive = cards.filter(
    (card) =>
      !isArchivedCard(card) &&
      isWorkingColumn(card) &&
      card.priority !== 'urgent',
  );
  const holdActive = cards.filter((card) => !isArchivedCard(card) && isHoldCard(card));
  const staleActive = cards.filter((card) => !isArchivedCard(card) && isStaleCard(card));
  const longHoldActive = cards.filter((card) => !isArchivedCard(card) && isLongHoldCard(card));
  const boardDoneCount = cards.filter((card) => !isArchivedCard(card) && card.column_id === 'done').length;
  const doneToday = todayCards.filter((card) => card.column_id === 'done');
  const todayActive = todayCards.filter((card) => card.column_id !== 'done');
  const feedNotices = filterNoticesForFeed(notices);
  const announcements = feedNotices.filter((notice) => notice.type === 'announcement');
  const pinnedAnnouncements = announcements.filter((notice) => notice.is_pinned);
  const changes = feedNotices.filter((notice) => notice.type === 'change');

  return {
    todayCards,
    todayActive,
    unackedUrgent,
    urgentActive,
    progressActive,
    holdActive,
    staleActive,
    longHoldActive,
    boardDoneCount,
    doneToday,
    announcements,
    pinnedAnnouncements,
    changes,
  };
}

export { formatActivityDetail } from '@/lib/handover/activity-display';

export function cardStatusLabel(card: Card): string {
  return `${COLUMN_LABELS[card.column_id]} · ${card.category}`;
}

export function formatExpiryLabel(expiresAt: string | null): { text: string; soon: boolean } | null {
  if (!expiresAt) return null;
  const date = new Date(`${expiresAt}T23:59:59`);
  if (Number.isNaN(date.getTime())) return null;
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return { text: '오늘까지', soon: true };
  if (days <= 3) return { text: `${days}일 남음`, soon: true };
  return { text: `${expiresAt}까지`, soon: false };
}

export function todayDateString(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
