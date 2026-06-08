'use client';

import { useQuery } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { ActivityLog, ShiftHandoverType } from '@/lib/handover/types';

async function fetchActivityLogs(limit: number): Promise<ActivityLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ActivityLog[];
}

export function useActivityLogs(limit = 80) {
  return useQuery({
    queryKey: ['activity-logs', DEFAULT_HOTEL_ID, limit],
    queryFn: () => fetchActivityLogs(limit),
  });
}

/** 일일 요약 export용 — 오늘 기록만 최대 limit건 */
export async function fetchTodayActivityLogs(limit = 200): Promise<ActivityLog[]> {
  const logs = await fetchActivityLogs(limit);
  const today = new Date().toISOString().slice(0, 10);
  return logs.filter((log) => log.created_at.startsWith(today));
}

export async function logShiftHandover(input: {
  shift: string;
  staffName: string;
  handoverType: ShiftHandoverType;
  unackedUrgent: number;
  urgentCount: number;
  progressCount: number;
  todayCount: number;
  checklistIncomplete: number;
  progressRemaining: number;
  notes?: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('shift_handovers').insert({
    hotel_id: DEFAULT_HOTEL_ID,
    shift: input.shift,
    staff_name: input.staffName,
    handover_type: input.handoverType,
    unacked_urgent: input.unackedUrgent,
    urgent_count: input.urgentCount,
    progress_count: input.progressCount,
    today_count: input.todayCount,
    checklist_incomplete: input.checklistIncomplete,
    progress_remaining: input.progressRemaining,
    notes: input.notes ?? '',
  });
  if (error) throw error;
}

export async function fetchChecklistIncomplete(
  shift: string,
  group: string,
): Promise<{ total: number; incomplete: number }> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const scopes = group ? ['common', group] : ['common'];

  const { data: items } = await supabase
    .from('checklist_items')
    .select('id')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('is_active', true)
    .in('work_group', scopes);

  let completionsQuery = supabase
    .from('checklist_completions')
    .select('item_id')
    .eq('work_date', today)
    .eq('shift', shift);

  if (group) {
    completionsQuery = completionsQuery.eq('work_group', group);
  }

  const { data: completions } = await completionsQuery;

  const completedIds = new Set((completions ?? []).map((row) => row.item_id));
  const total = items?.length ?? 0;
  const incomplete = (items ?? []).filter((item) => !completedIds.has(item.id)).length;
  return { total, incomplete };
}
