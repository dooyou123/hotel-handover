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

const LOOKBACK_DAYS = 90;

function isFacilityCategory(category: string): category is '시설' | '컴플레인' {
  return (FACILITY_CATEGORIES as readonly string[]).includes(category);
}

export function filterFacilityCards(cards: Card[]): Card[] {
  const cutoff = Date.now() - LOOKBACK_DAYS * 86_400_000;
  return cards.filter((card) => {
    if (!isFacilityCategory(card.category)) return false;
    if (card.archived_at) return false;
    const at = new Date(card.created_at).getTime();
    return !Number.isNaN(at) && at >= cutoff;
  });
}

export function buildFacilitySummaries(cards: Card[]): FacilityIssueSummary[] {
  const facilityCards = filterFacilityCards(cards);
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
      const openCount = sorted.filter((c) => c.column_id !== 'done').length;
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
  return filterFacilityCards(cards)
    .filter((card) => (card.room.trim() || '(객실 미지정)') === normalized)
    .map((card) => ({
      card,
      issueKind: card.category as '시설' | '컴플레인',
    }))
    .sort((a, b) =>
      (b.card.updated_at || b.card.created_at).localeCompare(a.card.updated_at || a.card.created_at),
    );
}
