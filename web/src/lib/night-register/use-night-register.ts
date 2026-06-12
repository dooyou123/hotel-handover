'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { NightRegisterInput, NightRegisterLog } from '@/lib/night-register/types';

export function nightRegisterQueryKey(workDate: string, shift = 'C') {
  return ['night-register', DEFAULT_HOTEL_ID, workDate, shift] as const;
}

async function fetchNightRegister(workDate: string, shift: string): Promise<NightRegisterLog | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('night_register_logs')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('work_date', workDate)
    .eq('shift', shift)
    .maybeSingle();
  if (error) throw error;
  return (data as NightRegisterLog | null) ?? null;
}

export function useNightRegister(workDate: string, shift = 'C') {
  const queryClient = useQueryClient();
  const queryKey = nightRegisterQueryKey(workDate, shift);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchNightRegister(workDate, shift),
    enabled: Boolean(workDate),
  });

  const saveRegister = useMutation({
    mutationFn: async (input: NightRegisterInput) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('night_register_logs')
        .upsert({ ...input, hotel_id: DEFAULT_HOTEL_ID }, { onConflict: 'hotel_id,work_date,shift' })
        .select('*')
        .single();
      if (error) throw error;
      return data as NightRegisterLog;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    register: query.data,
    isLoading: query.isLoading,
    error: query.error,
    saveRegister,
  };
}
