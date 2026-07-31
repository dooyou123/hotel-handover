import type { ActivityLog, Card, ShiftHandover } from '@/lib/handover/types';

/**
 * "다녀온 사이 바뀐 것" 기준점.
 * 공용 계정 환경이라 로그인 대신 교대 기록(shift_handovers)을 사용한다:
 * 내 이름의 마지막 교대 종료(없으면 시작) 시각 이후의 변경을 "안 본 변경"으로 본다.
 * 근무 중 "모두 확인"을 누르면 그 시각(localStorage, 이름별)이 기준점이 된다.
 */

const CLEARED_KEY_PREFIX = 'handover-unseen-cleared-v1';

/** DB(+00:00)와 toISOString(Z) 표기가 섞여도 안전하게 비교하기 위해 epoch(ms)으로 변환 */
function toTime(value: string | null | undefined): number {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

export function unseenClearedStorageKey(staffName: string): string {
  return `${CLEARED_KEY_PREFIX}:${encodeURIComponent(staffName)}`;
}

export function loadUnseenClearedAt(staffName: string): string | null {
  if (typeof window === 'undefined' || !staffName) return null;
  try {
    const raw = window.localStorage.getItem(unseenClearedStorageKey(staffName));
    if (!raw || !toTime(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function saveUnseenClearedAt(staffName: string, isoTime: string): void {
  if (typeof window === 'undefined' || !staffName) return;
  try {
    window.localStorage.setItem(unseenClearedStorageKey(staffName), isoTime);
  } catch {
    // 저장 실패 시 다음 방문에 배지가 다시 보일 뿐, 동작에는 지장 없음
  }
}

/** 내 이름의 교대 기록에서 기준점 후보를 고른다: 마지막 '종료' 우선, 없으면 마지막 '시작' */
export function pickLastShiftBaseline(
  records: ShiftHandover[],
  staffName: string,
): string | null {
  const mine = records
    .filter((record) => record.staff_name === staffName)
    .sort((a, b) => toTime(b.handover_at) - toTime(a.handover_at));
  if (!mine.length) return null;
  const lastEnd = mine.find((record) => record.handover_type === 'end');
  return (lastEnd ?? mine[0]).handover_at;
}

/** 교대 기록 기준점과 "모두 확인" 시각 중 더 최근 값 */
export function resolveUnseenBaseline(
  shiftBaseline: string | null,
  clearedAt: string | null,
): string | null {
  if (!shiftBaseline && !clearedAt) return null;
  if (!shiftBaseline) return clearedAt;
  if (!clearedAt) return shiftBaseline;
  return toTime(clearedAt) > toTime(shiftBaseline) ? clearedAt : shiftBaseline;
}

/**
 * 기준점 이후 변경된 카드 id 집합.
 * - updated_at이 기준점보다 새 카드가 대상 (작성·수정·상태 변경·댓글 모두 updated_at을 갱신)
 * - 그 기간의 activity_logs가 전부 내 이름의 행동뿐인 카드는 제외 (내가 한 일은 새 소식이 아님)
 * - 로그가 없는데 updated_at만 새 카드는 포함 (놓치는 것보다 보여주는 쪽이 안전)
 */
export function computeUnseenCardIds(input: {
  cards: Card[];
  logs: ActivityLog[];
  baseline: string;
  staffName: string;
}): Set<string> {
  const { cards, logs, staffName } = input;
  const baseline = toTime(input.baseline);

  const actorsByCard = new Map<string, { mine: boolean; others: boolean }>();
  for (const log of logs) {
    if (log.entity_type !== 'card' || !log.entity_id) continue;
    if (toTime(log.created_at) <= baseline) continue;
    const entry = actorsByCard.get(log.entity_id) ?? { mine: false, others: false };
    if (log.staff_name === staffName) entry.mine = true;
    else entry.others = true;
    actorsByCard.set(log.entity_id, entry);
  }

  const unseen = new Set<string>();
  for (const card of cards) {
    if (toTime(card.updated_at) <= baseline) continue;
    const actors = actorsByCard.get(card.id);
    if (actors && actors.mine && !actors.others) continue;
    unseen.add(card.id);
  }
  return unseen;
}
