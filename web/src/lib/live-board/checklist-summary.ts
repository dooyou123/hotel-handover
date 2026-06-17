import { DEFAULT_HOTEL_ID, WORK_GROUPS } from '@/lib/constants';
import { todayDateString } from '@/lib/handover/shift-summary';
import { createClient } from '@/lib/supabase/client';
import type { LiveBoardChecklist } from '@/lib/live-board/build-feed';

/** 당일 전 조 체크리스트 완료율 (라이브 보드용) */
export async function fetchTodayChecklistSummary(): Promise<LiveBoardChecklist | null> {
  const supabase = createClient();
  const workDate = todayDateString();

  const { data: items, error: itemsError } = await supabase
    .from('checklist_items')
    .select('id, work_group')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('is_active', true);

  if (itemsError || !items?.length) return null;

  const { data: completions, error: completionsError } = await supabase
    .from('checklist_completions')
    .select('item_id')
    .eq('work_date', workDate);

  if (completionsError) return null;

  const completedIds = new Set((completions ?? []).map((row) => row.item_id));
  const total = items.length;
  const completed = items.filter((item) => completedIds.has(item.id)).length;

  const groupsDone = WORK_GROUPS.filter((group) => {
    const groupItems = items.filter((item) => item.work_group === group || item.work_group === 'common');
    if (!groupItems.length) return true;
    return groupItems.every((item) => completedIds.has(item.id));
  }).length;

  return {
    total,
    completed,
    label: `오늘 체크리스트 ${completed}/${total} · ${groupsDone}/${WORK_GROUPS.length}조 완료`,
  };
}
