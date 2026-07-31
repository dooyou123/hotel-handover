import type { Card } from '@/lib/handover/types';

/**
 * 사건 스레드 — 누수 신고 → 업체 방문 → 보상 처리처럼 며칠에 걸쳐 이어지는
 * 카드들을 하나의 thread_id로 묶는다. 쌍 연결이 아니라 그룹 방식이라
 * "사건 전체 흐름" 조회가 thread_id 하나로 끝난다.
 */

export type ThreadLinkPlan =
  /** 둘 다 스레드가 없음 → 새 스레드를 만들어 둘 다 넣기 */
  | { kind: 'create'; threadId: string; cardIds: string[] }
  /** 한쪽만 스레드가 있음 → 없는 쪽이 합류 */
  | { kind: 'join'; threadId: string; cardIds: string[] }
  /** 둘 다 다른 스레드 → 대상 스레드 전체를 병합 */
  | { kind: 'merge'; threadId: string; fromThreadId: string }
  /** 이미 같은 스레드 */
  | { kind: 'none' };

export function planThreadLink(
  source: Pick<Card, 'id' | 'thread_id'>,
  target: Pick<Card, 'id' | 'thread_id'>,
  generateId: () => string,
): ThreadLinkPlan {
  if (source.id === target.id) return { kind: 'none' };
  if (source.thread_id && source.thread_id === target.thread_id) return { kind: 'none' };

  if (!source.thread_id && !target.thread_id) {
    return { kind: 'create', threadId: generateId(), cardIds: [source.id, target.id] };
  }
  if (source.thread_id && !target.thread_id) {
    return { kind: 'join', threadId: source.thread_id, cardIds: [target.id] };
  }
  if (!source.thread_id && target.thread_id) {
    return { kind: 'join', threadId: target.thread_id, cardIds: [source.id] };
  }
  // 둘 다 서로 다른 스레드 → 현재 열려 있는 카드(source) 쪽으로 병합
  return { kind: 'merge', threadId: source.thread_id!, fromThreadId: target.thread_id! };
}

/** 사건 흐름은 발생 순서(작성 시각)대로 보여준다 */
export function sortThreadCards<T extends { created_at: string }>(cards: T[]): T[] {
  return [...cards].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/**
 * 연결 피커의 기본 후보 — 같은 객실이 가장 유력하고, 그다음 같은 분류.
 * 점수가 같으면 최근에 움직인 카드 우선. 자기 자신과 이미 같은 스레드인 카드는 제외.
 */
export function suggestThreadCandidates(
  card: Pick<Card, 'id' | 'thread_id' | 'room' | 'category'>,
  others: Card[],
  limit = 6,
): Card[] {
  const room = card.room.trim();
  const category = card.category.trim();

  const scored = others
    .filter(
      (other) =>
        other.id !== card.id && (!card.thread_id || other.thread_id !== card.thread_id),
    )
    .map((other) => {
      let score = 0;
      if (room && other.room.trim() === room) score += 2;
      if (category && other.category.trim() === category) score += 1;
      return { other, score };
    })
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return (b.other.updated_at || b.other.created_at).localeCompare(
        a.other.updated_at || a.other.created_at,
      );
    });

  return scored.slice(0, limit).map((item) => item.other);
}

export type ThreadRowGroup<T> = {
  /** null이면 스레드 없는 단독 카드 */
  threadId: string | null;
  cards: T[];
};

/**
 * 목록 표시용 그룹핑 — 정렬 순서를 유지하되, 같은 스레드의 카드들은
 * 첫 번째 카드 위치로 끌어와 하나의 묶음으로 보여준다.
 */
export function groupCardsByThread<T extends { id: string; thread_id: string | null }>(
  cards: T[],
): ThreadRowGroup<T>[] {
  const groups: ThreadRowGroup<T>[] = [];
  const indexByThread = new Map<string, number>();

  for (const card of cards) {
    if (!card.thread_id) {
      groups.push({ threadId: null, cards: [card] });
      continue;
    }
    const existing = indexByThread.get(card.thread_id);
    if (existing !== undefined) {
      groups[existing].cards.push(card);
      continue;
    }
    indexByThread.set(card.thread_id, groups.length);
    groups.push({ threadId: card.thread_id, cards: [card] });
  }

  return groups;
}

/** 목록 배지용 — 활성 카드 안에서 스레드별 카드 수 */
export function buildThreadCounts(cards: Pick<Card, 'thread_id'>[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    if (!card.thread_id) continue;
    counts.set(card.thread_id, (counts.get(card.thread_id) ?? 0) + 1);
  }
  return counts;
}
