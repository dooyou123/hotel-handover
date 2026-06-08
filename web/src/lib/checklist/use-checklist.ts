import { SHIFTS } from '@/lib/constants';
import { todayDateString } from '@/lib/handover/shift-summary';
import type { ChecklistScope } from '@/lib/constants';

export type ChecklistItemView = {
  id: string;
  label: string;
  sort_order: number;
  work_group: ChecklistScope;
  completed: boolean;
  completed_by: string;
  completed_at: string | null;
};

export type ChecklistSection = {
  scope: ChecklistScope;
  label: string;
  items: ChecklistItemView[];
};

export type ChecklistData = {
  work_date: string;
  shift: string;
  group: string;
  items: ChecklistItemView[];
  sections: ChecklistSection[];
};

function buildSections(items: ChecklistItemView[], group: string): ChecklistSection[] {
  const common = items.filter((item) => item.work_group === 'common');
  const groupItems = items.filter((item) => item.work_group === group);
  const sections: ChecklistSection[] = [];

  if (common.length) {
    sections.push({ scope: 'common', label: '공통 확인', items: common });
  }
  if (groupItems.length) {
    sections.push({ scope: group as ChecklistScope, label: `${group}조 전용`, items: groupItems });
  }

  return sections;
}

export async function fetchChecklistForShift(shift: string, group: string): Promise<ChecklistData> {
  const { createClient } = await import('@/lib/supabase/client');
  const { DEFAULT_HOTEL_ID } = await import('@/lib/constants');
  const supabase = createClient();
  const workDate = todayDateString();

  const scopes = group ? ['common', group] : ['common'];

  const { data: items, error: itemsError } = await supabase
    .from('checklist_items')
    .select('id, label, sort_order, work_group')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('is_active', true)
    .in('work_group', scopes)
    .order('sort_order');

  if (itemsError) throw itemsError;

  let completionsQuery = supabase
    .from('checklist_completions')
    .select('item_id, shift, staff_name, completed_at, work_group')
    .eq('work_date', workDate)
    .eq('shift', shift);

  if (group) {
    completionsQuery = completionsQuery.eq('work_group', group);
  }

  const { data: completions, error: completionsError } = await completionsQuery;

  if (completionsError) throw completionsError;

  const completionMap = new Map((completions ?? []).map((row) => [row.item_id, row]));

  const mapped: ChecklistItemView[] = (items ?? []).map((item) => {
    const done = completionMap.get(item.id);
    return {
      id: item.id,
      label: item.label,
      sort_order: item.sort_order,
      work_group: item.work_group as ChecklistScope,
      completed: Boolean(done),
      completed_by: done ? `${done.shift} · ${done.staff_name}` : '',
      completed_at: done?.completed_at ?? null,
    };
  });

  return {
    work_date: workDate,
    shift,
    group,
    items: mapped,
    sections: buildSections(mapped, group),
  };
}

export async function toggleChecklistItem(
  itemId: string,
  shift: string,
  group: string,
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
    .eq('work_group', group)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('checklist_completions').delete().eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('checklist_completions').insert({
      item_id: itemId,
      work_date: workDate,
      shift,
      work_group: group,
      staff_name: staffName,
    });
    if (error) throw error;
  }

  return fetchChecklistForShift(shift, group);
}

export function isValidShift(shift: string): shift is (typeof SHIFTS)[number] {
  return (SHIFTS as readonly string[]).includes(shift);
}
