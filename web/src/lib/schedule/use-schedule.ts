'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID, type WorkGroupCode } from '@/lib/constants';
import { emptyGroupSchedule, normalizeScheduleGroup } from '@/lib/schedule/group-utils';
import { createClient } from '@/lib/supabase/client';
import { todayDateString } from '@/lib/handover/shift-summary';
import { monthDateRange } from '@/lib/schedule/month-range';
import { parseSchedulePaste, type ParsedScheduleRow, type ScheduleEntry } from '@/lib/schedule/parse-csv';

export type TodaySchedule = {
  work_date: string;
  groups: Record<WorkGroupCode, string[]>;
};

async function fetchMonthSchedule(month: string): Promise<ScheduleEntry[]> {
  const supabase = createClient();
  const { start, end } = monthDateRange(month);
  const { data, error } = await supabase
    .from('schedule_entries')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .gte('work_date', start)
    .lte('work_date', end)
    .order('work_date')
    .order('shift')
    .order('staff_name');
  if (error) throw error;
  return (data ?? []) as ScheduleEntry[];
}

async function fetchTodaySchedule(): Promise<TodaySchedule> {
  const supabase = createClient();
  const workDate = todayDateString();
  const { data, error } = await supabase
    .from('schedule_entries')
    .select('shift, staff_name')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('work_date', workDate)
    .order('shift')
    .order('staff_name');
  if (error) throw error;

  const groups = emptyGroupSchedule();
  (data ?? []).forEach((row) => {
    const group = normalizeScheduleGroup(row.shift);
    if (group) groups[group].push(row.staff_name);
  });

  return { work_date: workDate, groups };
}

export function useMonthSchedule(month: string) {
  return useQuery({
    queryKey: ['schedule-month', DEFAULT_HOTEL_ID, month],
    queryFn: () => fetchMonthSchedule(month),
    enabled: /^\d{4}-\d{2}$/.test(month),
  });
}

export function useTodaySchedule() {
  return useQuery({
    queryKey: ['schedule-today', DEFAULT_HOTEL_ID],
    queryFn: fetchTodaySchedule,
  });
}

export async function uploadScheduleEntries(
  month: string,
  entries: ParsedScheduleRow[],
  replace = true,
): Promise<{ inserted: number; schedule: ScheduleEntry[] }> {
  if (!entries.length) throw new Error('등록할 근무표가 없습니다.');

  const supabase = createClient();
  if (replace) {
    const { start, end } = monthDateRange(month);
    const { error } = await supabase
      .from('schedule_entries')
      .delete()
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .gte('work_date', start)
      .lte('work_date', end);
    if (error) throw error;
  }

  const rows = entries.map((entry) => ({
    hotel_id: DEFAULT_HOTEL_ID,
    work_date: entry.work_date,
    shift: entry.shift,
    staff_name: entry.staff_name,
  }));

  const { error: insertError } = await supabase.from('schedule_entries').upsert(rows, {
    onConflict: 'hotel_id,work_date,shift,staff_name',
    ignoreDuplicates: false,
  });
  if (insertError) throw insertError;

  const schedule = await fetchMonthSchedule(month);
  return { inserted: rows.length, schedule };
}

export async function uploadScheduleCsv(
  month: string,
  csvText: string,
  replace = true,
): Promise<{ inserted: number; errors: string[]; schedule: ScheduleEntry[] }> {
  const parsed = parseSchedulePaste(csvText, month);
  if ('error' in parsed) throw new Error(parsed.error);

  const result = await uploadScheduleEntries(month, parsed.entries, replace);
  return { inserted: result.inserted, errors: parsed.errors, schedule: result.schedule };
}

export type ScheduleEntryInput = {
  work_date: string;
  shift: string;
  staff_name: string;
};

export function invalidateScheduleQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['schedule-month'] });
  queryClient.invalidateQueries({ queryKey: ['schedule-today'] });
}

export function useScheduleMutations() {
  const queryClient = useQueryClient();

  const createEntry = useMutation({
    mutationFn: async (input: ScheduleEntryInput | ScheduleEntryInput[]) => {
      const rows = (Array.isArray(input) ? input : [input]).map((row) => ({
        ...row,
        hotel_id: DEFAULT_HOTEL_ID,
      }));
      const supabase = createClient();
      const { data, error } = await supabase.from('schedule_entries').insert(rows).select('*');
      if (error) throw error;
      return (data ?? []) as ScheduleEntry[];
    },
    onSuccess: () => invalidateScheduleQueries(queryClient),
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ScheduleEntryInput }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('schedule_entries')
        .update(input)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as ScheduleEntry;
    },
    onSuccess: () => invalidateScheduleQueries(queryClient),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('schedule_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateScheduleQueries(queryClient),
  });

  const deleteMonth = useMutation({
    mutationFn: async (month: string) => {
      const supabase = createClient();
      const { start, end } = monthDateRange(month);
      const { error } = await supabase
        .from('schedule_entries')
        .delete()
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .gte('work_date', start)
        .lte('work_date', end);
      if (error) throw error;
    },
    onSuccess: () => invalidateScheduleQueries(queryClient),
  });

  return { createEntry, updateEntry, deleteEntry, deleteMonth };
}
