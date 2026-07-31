'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

function isSchemaMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === '42703' || error.code === '42P01' || error.code === 'PGRST205') return true;
  return /does not exist/i.test(error.message ?? '');
}

/** 이름별 개인 메모장 — staff_name 기준 1인 1메모, 기기 간 동기화를 위해 DB에 저장 */
export function useStaffMemoPad(staffName: string) {
  const queryClient = useQueryClient();
  const queryKey = ['staff-memo-pad', DEFAULT_HOTEL_ID, staffName] as const;

  const query = useQuery({
    queryKey,
    enabled: Boolean(staffName),
    staleTime: 30_000,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('staff_memo_pads')
        .select('content, updated_at')
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .eq('staff_name', staffName)
        .maybeSingle();
      if (error) {
        if (isSchemaMissing(error)) return null;
        throw error;
      }
      return data ?? { content: '', updated_at: null as string | null };
    },
  });

  const saveMemo = useMutation({
    mutationFn: async (content: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('staff_memo_pads')
        .upsert(
          { hotel_id: DEFAULT_HOTEL_ID, staff_name: staffName, content },
          { onConflict: 'hotel_id,staff_name' },
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    content: query.data?.content ?? '',
    updatedAt: query.data?.updated_at ?? null,
    isLoading: query.isLoading,
    schemaMissing: query.data === null && !query.isLoading,
    saveMemo,
  };
}
