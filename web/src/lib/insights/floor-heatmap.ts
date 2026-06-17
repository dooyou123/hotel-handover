import { FACILITY_CATEGORIES } from '@/lib/constants';
import type { Card } from '@/lib/handover/types';
import type { GuestReview } from '@/lib/reviews/types';
import { KNOWN_HOTEL_FLOORS, normalizeRoomNumber, parseRoomFloor } from '@/lib/insights/room-floor';

export type FloorHeatmapLookback = 7 | 30;

export type FloorHeatIntensity = 'none' | 'low' | 'medium' | 'high';

export type FloorHeatmapEventKind = 'handover' | 'complaint' | 'facility' | 'roomIssue' | 'review';

export type FloorHeatmapEvent = {
  id: string;
  kind: FloorHeatmapEventKind;
  room: string;
  categoryLabel: string;
  title: string;
  createdAt: string;
  href: string;
  score: number;
};

export type FloorRoomStat = {
  room: string;
  score: number;
  handover: number;
  complaint: number;
  facility: number;
  roomIssue: number;
  reviews: number;
  negativeReviews: number;
};

export type FloorHeatmapCell = {
  floor: number;
  handoverCount: number;
  complaintCount: number;
  facilityCount: number;
  roomIssueCount: number;
  reviewCount: number;
  negativeReviewCount: number;
  totalScore: number;
  intensity: FloorHeatIntensity;
  topRooms: FloorRoomStat[];
  recentEvents: FloorHeatmapEvent[];
};

export type FloorHeatmapResult = {
  lookbackDays: FloorHeatmapLookback;
  cells: FloorHeatmapCell[];
  maxScore: number;
  totalEvents: number;
};

const SCORE = {
  complaint: 3,
  facility: 2,
  roomIssue: 2,
  handover: 1,
  review: 1,
  negativeReview: 3,
} as const;

function isWithinLookback(iso: string, lookbackDays: number, now = Date.now()): boolean {
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return false;
  const cutoff = now - lookbackDays * 86_400_000;
  return at >= cutoff;
}

function intensityFromScore(score: number, maxScore: number): FloorHeatIntensity {
  if (score <= 0 || maxScore <= 0) return 'none';
  const ratio = score / maxScore;
  if (ratio >= 0.7) return 'high';
  if (ratio >= 0.35) return 'medium';
  return 'low';
}

const EVENT_KIND_LABEL: Record<FloorHeatmapEventKind, string> = {
  handover: '인계',
  complaint: '컴플레인',
  facility: '시설',
  roomIssue: '룸이슈',
  review: '부정 리뷰',
};

function truncateText(text: string, max = 72): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '(내용 없음)';
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function cardEventKind(category: string): FloorHeatmapEventKind {
  if (category === '컴플레인') return 'complaint';
  if (category === '시설') return 'facility';
  if (category === '룸이슈') return 'roomIssue';
  return 'handover';
}

function cardEventTitle(card: Card): string {
  if (card.title.trim()) return truncateText(card.title);
  const firstLine = card.details.split('\n').find((line) => line.trim());
  if (firstLine?.trim()) return truncateText(firstLine);
  return '(내용 없음)';
}

function reviewEventTitle(review: GuestReview): string {
  const text = review.content_ko.trim() || review.content_original.trim();
  if (!text) return '(리뷰 내용 없음)';
  return truncateText(text, 80);
}

function eventScoreForKind(kind: FloorHeatmapEventKind): number {
  if (kind === 'complaint') return SCORE.complaint;
  if (kind === 'facility') return SCORE.facility;
  if (kind === 'roomIssue') return SCORE.roomIssue;
  if (kind === 'review') return SCORE.negativeReview;
  return SCORE.handover;
}

export function buildFloorHeatmap(input: {
  cards: Card[];
  reviews: GuestReview[];
  lookbackDays: FloorHeatmapLookback;
  now?: number;
}): FloorHeatmapResult {
  const now = input.now ?? Date.now();
  const floorRooms = new Map<number, Map<string, FloorRoomStat>>();
  const floorEvents = new Map<number, FloorHeatmapEvent[]>();

  function ensureRoom(floor: number, room: string): FloorRoomStat {
    const byRoom = floorRooms.get(floor) ?? new Map<string, FloorRoomStat>();
    if (!floorRooms.has(floor)) floorRooms.set(floor, byRoom);
    const existing = byRoom.get(room);
    if (existing) return existing;
    const created: FloorRoomStat = {
      room,
      score: 0,
      handover: 0,
      complaint: 0,
      facility: 0,
      roomIssue: 0,
      reviews: 0,
      negativeReviews: 0,
    };
    byRoom.set(room, created);
    return created;
  }

  function bump(
    floor: number,
    room: string,
    patch: Partial<
      Pick<FloorRoomStat, 'handover' | 'complaint' | 'facility' | 'roomIssue' | 'reviews' | 'negativeReviews'>
    >,
    scoreDelta: number,
  ) {
    const stat = ensureRoom(floor, room);
    if (patch.handover) stat.handover += patch.handover;
    if (patch.complaint) stat.complaint += patch.complaint;
    if (patch.facility) stat.facility += patch.facility;
    if (patch.roomIssue) stat.roomIssue += patch.roomIssue;
    if (patch.reviews) stat.reviews += patch.reviews;
    if (patch.negativeReviews) stat.negativeReviews += patch.negativeReviews;
    stat.score += scoreDelta;
  }

  function pushEvent(floor: number, event: FloorHeatmapEvent) {
    const list = floorEvents.get(floor) ?? [];
    if (!floorEvents.has(floor)) floorEvents.set(floor, list);
    list.push(event);
  }

  for (const card of input.cards) {
    if (!isWithinLookback(card.created_at, input.lookbackDays, now)) continue;
    const room = normalizeRoomNumber(card.room);
    if (!room) continue;
    const floor = parseRoomFloor(room);
    if (floor == null) continue;

    const kind = cardEventKind(card.category);
    const scoreDelta = eventScoreForKind(kind);

    if (kind === 'complaint') {
      bump(floor, room, { complaint: 1 }, scoreDelta);
    } else if (kind === 'facility') {
      bump(floor, room, { facility: 1 }, scoreDelta);
    } else if (kind === 'roomIssue') {
      bump(floor, room, { roomIssue: 1 }, scoreDelta);
    } else {
      bump(floor, room, { handover: 1 }, scoreDelta);
    }

    pushEvent(floor, {
      id: `card-${card.id}`,
      kind,
      room,
      categoryLabel: EVENT_KIND_LABEL[kind],
      title: cardEventTitle(card),
      createdAt: card.created_at,
      href: `/handover?card=${card.id}`,
      score: scoreDelta,
    });
  }

  for (const review of input.reviews) {
    if (!review.is_active) continue;
    if (!isWithinLookback(review.created_at, input.lookbackDays, now)) continue;
    const room = normalizeRoomNumber(review.room_number);
    if (!room) continue;
    const floor = parseRoomFloor(room);
    if (floor == null) continue;

    if (review.sentiment === 'negative') {
      bump(floor, room, { reviews: 1, negativeReviews: 1 }, SCORE.negativeReview);
      pushEvent(floor, {
        id: `review-${review.id}`,
        kind: 'review',
        room,
        categoryLabel: EVENT_KIND_LABEL.review,
        title: reviewEventTitle(review),
        createdAt: review.created_at,
        href: '/reviews',
        score: SCORE.negativeReview,
      });
    } else {
      bump(floor, room, { reviews: 1 }, SCORE.review);
    }
  }

  const cells: FloorHeatmapCell[] = KNOWN_HOTEL_FLOORS.map((floor) => {
    const rooms = [...(floorRooms.get(floor)?.values() ?? [])].sort((a, b) => b.score - a.score);
    const handoverCount = rooms.reduce((sum, room) => sum + room.handover, 0);
    const complaintCount = rooms.reduce((sum, room) => sum + room.complaint, 0);
    const facilityCount = rooms.reduce((sum, room) => sum + room.facility, 0);
    const reviewCount = rooms.reduce((sum, room) => sum + room.reviews, 0);
    const negativeReviewCount = rooms.reduce((sum, room) => sum + room.negativeReviews, 0);
    const roomIssueCount = rooms.reduce((sum, room) => sum + room.roomIssue, 0);
    const totalScore = rooms.reduce((sum, room) => sum + room.score, 0);

    return {
      floor,
      handoverCount,
      complaintCount,
      facilityCount,
      roomIssueCount,
      reviewCount,
      negativeReviewCount,
      totalScore,
      intensity: 'none' as FloorHeatIntensity,
      topRooms: rooms.slice(0, 5),
      recentEvents: [...(floorEvents.get(floor) ?? [])]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 15),
    };
  });

  const maxScore = Math.max(0, ...cells.map((cell) => cell.totalScore));
  const withIntensity = cells.map((cell) => ({
    ...cell,
    intensity: intensityFromScore(cell.totalScore, maxScore),
  }));

  const totalEvents = withIntensity.reduce((sum, cell) => sum + cell.totalScore, 0);

  return {
    lookbackDays: input.lookbackDays,
    cells: withIntensity,
    maxScore,
    totalEvents,
  };
}

export function isFacilityOrComplaintCategory(category: string): boolean {
  return (FACILITY_CATEGORIES as readonly string[]).includes(category);
}
