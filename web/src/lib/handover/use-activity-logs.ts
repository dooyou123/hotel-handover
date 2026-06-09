'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { ActivityLog, ShiftHandoverType } from '@/lib/handover/types';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

export type ActivityLogFilters = {
  entityType: string;
  action: string;
  query: string;
};

export const ACTIVITY_ENTITY_OPTIONS = [
  { value: 'all', label: '전체 유형' },
  { value: 'card', label: '인수인계' },
  { value: 'notice', label: '게시판' },
] as const;

export const ACTIVITY_ACTION_OPTIONS = [
  { value: 'all', label: '전체 동작' },
  { value: 'create', label: '추가' },
  { value: 'update', label: '수정' },
  { value: 'delete', label: '삭제' },
  { value: 'move', label: '이동' },
  { value: 'archive_done', label: '완료 보관' },
  { value: 'restore_archive', label: '보관 복원' },
  { value: 'clear_done', label: '완료칸 비우기' },
] as const;

const activityLogsPool = {
  channel: null as RealtimeChannel | null,
  listeners: new Set<QueryClient>(),
};

function activityLogsQueryKey(filters: ActivityLogFilters, limit: number) {
  return ['activity-logs', DEFAULT_HOTEL_ID, limit, filters] as const;
}

function notifyActivityLogListeners() {
  activityLogsPool.listeners.forEach((client) => {
    client.invalidateQueries({ queryKey: ['activity-logs', DEFAULT_HOTEL_ID] });
  });
}

function ensureActivityLogsChannel(supabase: SupabaseClient) {
  if (activityLogsPool.channel) return;

  activityLogsPool.channel = supabase
    .channel('activity-logs')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'activity_logs', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
      () => notifyActivityLogListeners(),
    )
    .subscribe();
}

function releaseActivityLogsChannel(supabase: SupabaseClient) {
  if (activityLogsPool.listeners.size > 0 || !activityLogsPool.channel) return;
  supabase.removeChannel(activityLogsPool.channel);
  activityLogsPool.channel = null;
}

export function subscribeActivityLogs(queryClient: QueryClient): () => void {
  const supabase = createClient();
  activityLogsPool.listeners.add(queryClient);
  ensureActivityLogsChannel(supabase);

  return () => {
    activityLogsPool.listeners.delete(queryClient);
    releaseActivityLogsChannel(supabase);
  };
}

async function fetchActivityLogs(limit: number, filters: ActivityLogFilters): Promise<ActivityLog[]> {
  const supabase = createClient();
  let query = supabase
    .from('activity_logs')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.entityType !== 'all') {
    query = query.eq('entity_type', filters.entityType);
  }
  if (filters.action !== 'all') {
    query = query.eq('action', filters.action);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as ActivityLog[];
  const q = filters.query.trim().toLowerCase();
  if (!q) return rows;

  return rows.filter((log) => {
    const haystack = [log.summary, log.staff_name, log.shift, log.action, log.entity_type]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function useActivityLogs(options?: {
  limit?: number;
  filters?: ActivityLogFilters;
  enabled?: boolean;
}) {
  const limit = options?.limit ?? 150;
  const filters = options?.filters ?? { entityType: 'all', action: 'all', query: '' };
  const enabled = options?.enabled ?? true;
  const queryClient = useQueryClient();

  useEffect(() => subscribeActivityLogs(queryClient), [queryClient]);

  return useQuery({
    queryKey: activityLogsQueryKey(filters, limit),
    queryFn: () => fetchActivityLogs(limit, filters),
    enabled,
    staleTime: 15_000,
  });
}

/** 일일 요약 export용 — 오늘 기록만 최대 limit건 */
export async function fetchTodayActivityLogs(limit = 200): Promise<ActivityLog[]> {
  const logs = await fetchActivityLogs(limit, { entityType: 'all', action: 'all', query: '' });
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
