import { SHIFTS } from '@/lib/constants';
import { todayDateString } from '@/lib/handover/shift-summary';

export type ChecklistItemView = {
  id: string;
  label: string;
  sort_order: number;
  completed: boolean;
  completed_by: string;
  completed_at: string | null;
};

export type ChecklistData = {
  work_date: string;
  shift: string;
  items: ChecklistItemView[];
};

export async function fetchChecklistForShift(shift: string): Promise<ChecklistData> {
  const { createClient } = await import('@/lib/supabase/client');
  const { DEFAULT_HOTEL_ID } = await import('@/lib/constants');
  const supabase = createClient();
  const workDate = todayDateString();

  const { data: items, error: itemsError } = await supabase
    .from('checklist_items')
    .select('id, label, sort_order')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('is_active', true)
    .order('sort_order');

  if (itemsError) throw itemsError;

  const { data: completions, error: completionsError } = await supabase
    .from('checklist_completions')
    .select('item_id, shift, staff_name, completed_at')
    .eq('work_date', workDate)
    .eq('shift', shift);

  if (completionsError) throw completionsError;

  const completionMap = new Map((completions ?? []).map((row) => [row.item_id, row]));

  return {
    work_date: workDate,
    shift,
    items: (items ?? []).map((item) => {
      const done = completionMap.get(item.id);
      return {
        id: item.id,
        label: item.label,
        sort_order: item.sort_order,
        completed: Boolean(done),
        completed_by: done ? `${done.shift} · ${done.staff_name}` : '',
        completed_at: done?.completed_at ?? null,
      };
    }),
  };
}

export async function toggleChecklistItem(
  itemId: string,
  shift: string,
  staffName: string,
): Promise<ChecklistData> {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();
  const workDate = todayDateString();

  const { data: existing } = await supabase
    .from('checklist_completions')
    .select('id')
    .eq('item_id', itemId)
    .eq('work_date', workDate)
    .eq('shift', shift)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('checklist_completions').delete().eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('checklist_completions').insert({
      item_id: itemId,
      work_date: workDate,
      shift,
      staff_name: staffName,
    });
    if (error) throw error;
  }

  return fetchChecklistForShift(shift);
}

export function isValidShift(shift: string): shift is (typeof SHIFTS)[number] {
  return (SHIFTS as readonly string[]).includes(shift);
}
