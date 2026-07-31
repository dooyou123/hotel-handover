import type { ChecklistItem } from '@/lib/handover/types';

/**
 * 카드 안 체크리스트 — "업체 연락 → 방문 확인 → 보상 처리"처럼
 * 다음 조치가 여러 단계일 때 진행 상태를 항목별로 남긴다.
 * 조가 바뀌어도 체크 상태만 보면 다음 사람이 뭘 하면 되는지 바로 안다.
 */

export const MAX_CHECKLIST_ITEMS = 10;

/** DB(jsonb)에서 온 값 검증 — 형식이 깨진 항목은 버린다 */
export function sanitizeChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is ChecklistItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as ChecklistItem).id === 'string' &&
        typeof (item as ChecklistItem).text === 'string' &&
        (item as ChecklistItem).text.trim().length > 0 &&
        typeof (item as ChecklistItem).done === 'boolean',
    )
    .slice(0, MAX_CHECKLIST_ITEMS)
    .map((item) => ({
      id: item.id,
      text: item.text.trim(),
      done: item.done,
      done_by: item.done_by ?? null,
      done_at: item.done_at ?? null,
    }));
}

export function checklistProgress(items: ChecklistItem[]): { done: number; total: number } {
  return {
    done: items.filter((item) => item.done).length,
    total: items.length,
  };
}

export function toggleChecklistItem(
  items: ChecklistItem[],
  itemId: string,
  staffName: string,
  now: Date = new Date(),
): ChecklistItem[] {
  return items.map((item) => {
    if (item.id !== itemId) return item;
    const done = !item.done;
    return {
      ...item,
      done,
      done_by: done ? staffName || null : null,
      done_at: done ? now.toISOString() : null,
    };
  });
}

/** 수정 로그용 — 체크 상태가 바뀐 항목을 사람이 읽을 수 있는 문장으로 */
export function summarizeChecklistChanges(
  before: ChecklistItem[],
  after: ChecklistItem[],
): string[] {
  const changes: string[] = [];
  const beforeById = new Map(before.map((item) => [item.id, item]));

  for (const item of after) {
    const prev = beforeById.get(item.id);
    if (!prev) continue;
    if (!prev.done && item.done) changes.push(`체크 완료: ${item.text}`);
    if (prev.done && !item.done) changes.push(`체크 해제: ${item.text}`);
  }

  const added = after.filter((item) => !beforeById.has(item.id)).length;
  const removed = before.filter((item) => !after.some((next) => next.id === item.id)).length;
  const textChanged = after.some((item) => {
    const prev = beforeById.get(item.id);
    return prev && prev.text !== item.text;
  });
  if (added || removed || textChanged) changes.push('체크리스트 항목 변경');

  return changes;
}
