'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID, SHIFTS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { todayDateString } from '@/lib/handover/shift-summary';
import { monthDateRange } from '@/lib/schedule/month-range';
import { parseScheduleCsv, type ParsedScheduleRow, type ScheduleEntry } from '@/lib/schedule/parse-csv';

export type TodaySchedule = {
  work_date: string;
  shifts: Record<(typeof SHIFTS)[number], string[]>;
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

  const shifts: TodaySchedule['shifts'] = { 주간: [], 오후: [], 야간: [] };
  (data ?? []).forEach((row) => {
    const shift = row.shift as (typeof SHIFTS)[number];
    if (shifts[shift]) shifts[shift].push(row.staff_name);
  });

  return { work_date: workDate, shifts };
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

export async function uploadScheduleCsv(
  month: string,
  csvText: string,
  replace = true,
): Promise<{ inserted: number; errors: string[]; schedule: ScheduleEntry[] }> {
  const parsed = parseScheduleCsv(csvText, month);
  if ('error' in parsed) throw new Error(parsed.error);

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

  const rows = parsed.entries.map((entry: ParsedScheduleRow) => ({
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
  return { inserted: rows.length, errors: parsed.errors, schedule };
}

export function invalidateScheduleQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['schedule-month'] });
  queryClient.invalidateQueries({ queryKey: ['schedule-today'] });
}
