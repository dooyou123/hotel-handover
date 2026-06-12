import { FACILITY_CATEGORIES } from '@/lib/constants';
import type { Card } from '@/lib/handover/types';

export type FacilityIssueSummary = {
  room: string;
  totalCount: number;
  openCount: number;
  facilityCount: number;
  complaintCount: number;
  recentTitles: string[];
  lastAt: string;
};

export type FacilityRoomIssue = {
  card: Card;
  issueKind: '시설' | '컴플레인';
};

const LOOKBACK_MONTHS = 6;

function isWithinLookback(card: Card): boolean {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - LOOKBACK_MONTHS);
  cutoff.setHours(0, 0, 0, 0);
  const at = new Date(card.created_at).getTime();
  return !Number.isNaN(at) && at >= cutoff.getTime();
}

function isFacilityCategory(category: string): category is '시설' | '컴플레인' {
  return (FACILITY_CATEGORIES as readonly string[]).includes(category);
}

export function filterFacilityCards(cards: Card[], options?: { includeArchived?: boolean }): Card[] {
  const includeArchived = options?.includeArchived ?? false;
  return cards.filter((card) => {
    if (!isFacilityCategory(card.category)) return false;
    if (!includeArchived && card.archived_at) return false;
    return isWithinLookback(card);
  });
}

export function mergeFacilityCardSources(activeCards: Card[], archivedCards: Card[]): Card[] {
  return [...activeCards, ...archivedCards];
}

export function buildFacilitySummaries(cards: Card[]): FacilityIssueSummary[] {
  const facilityCards = filterFacilityCards(cards, { includeArchived: true });
  const byRoom = new Map<string, Card[]>();

  for (const card of facilityCards) {
    const room = card.room.trim() || '(객실 미지정)';
    const list = byRoom.get(room) ?? [];
    list.push(card);
    byRoom.set(room, list);
  }

  return [...byRoom.entries()]
    .map(([room, roomCards]) => {
      const sorted = [...roomCards].sort((a, b) =>
        (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at),
      );
      const openCount = sorted.filter((c) => !c.archived_at && c.column_id !== 'done').length;
      return {
        room,
        totalCount: sorted.length,
        openCount,
        facilityCount: sorted.filter((c) => c.category === '시설').length,
        complaintCount: sorted.filter((c) => c.category === '컴플레인').length,
        recentTitles: sorted.slice(0, 3).map((c) => c.title),
        lastAt: sorted[0]?.updated_at || sorted[0]?.created_at || '',
      };
    })
    .sort((a, b) => {
      if (b.openCount !== a.openCount) return b.openCount - a.openCount;
      return b.totalCount - a.totalCount;
    });
}

export function getOpenFacilityIssues(cards: Card[]): FacilityRoomIssue[] {
  return filterFacilityCards(cards)
    .filter((card) => card.column_id !== 'done')
    .map((card) => ({
      card,
      issueKind: card.category as '시설' | '컴플레인',
    }))
    .sort((a, b) =>
      (b.card.updated_at || b.card.created_at).localeCompare(a.card.updated_at || a.card.created_at),
    );
}

export function getRoomFacilityIssues(cards: Card[], room: string): FacilityRoomIssue[] {
  const normalized = room.trim();
  return filterFacilityCards(cards, { includeArchived: true })
    .filter((card) => (card.room.trim() || '(객실 미지정)') === normalized)
    .map((card) => ({
      card,
      issueKind: card.category as '시설' | '컴플레인',
    }))
    .sort((a, b) =>
      (b.card.updated_at || b.card.created_at).localeCompare(a.card.updated_at || a.card.created_at),
    );
}
