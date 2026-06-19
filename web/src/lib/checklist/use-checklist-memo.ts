'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { ChecklistShiftMemo, ChecklistShiftMemoInput } from '@/lib/checklist/types';

export function checklistMemoQueryKey(workDate: string, shift: string, workGroup: string) {
  return ['checklist-memo', DEFAULT_HOTEL_ID, workDate, shift, workGroup] as const;
}

async function fetchChecklistMemo(
  workDate: string,
  shift: string,
  workGroup: string,
): Promise<ChecklistShiftMemo | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('checklist_shift_memos')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('work_date', workDate)
    .eq('shift', shift)
    .eq('work_group', workGroup)
    .maybeSingle();
  if (error) throw error;
  return (data as ChecklistShiftMemo | null) ?? null;
}

export function useChecklistMemo(workDate: string, shift: string, workGroup: string) {
  const queryClient = useQueryClient();
  const queryKey = checklistMemoQueryKey(workDate, shift, workGroup);
  const enabled = Boolean(workDate && shift && workGroup);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchChecklistMemo(workDate, shift, workGroup),
    enabled,
  });

  const saveMemo = useMutation({
    mutationFn: async (input: ChecklistShiftMemoInput) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('checklist_shift_memos')
        .upsert(
          {
            hotel_id: DEFAULT_HOTEL_ID,
            work_date: input.work_date,
            shift: input.shift,
            work_group: input.work_group,
            memo: input.memo,
            updated_by: input.updated_by,
          },
          { onConflict: 'hotel_id,work_date,shift,work_group' },
        )
        .select('*')
        .single();
      if (error) throw error;
      return data as ChecklistShiftMemo;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    memo: query.data,
    isLoading: query.isLoading,
    error: query.error,
    saveMemo,
  };
}
