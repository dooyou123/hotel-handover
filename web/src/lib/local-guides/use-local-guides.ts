'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { LocalGuide, LocalGuideInput } from '@/lib/local-guides/types';

async function fetchLocalGuides(): Promise<LocalGuide[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('local_guides')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('sort_order')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as LocalGuide[];
}

export function useLocalGuides() {
  const queryClient = useQueryClient();
  const queryKey = ['local-guides', DEFAULT_HOTEL_ID] as const;

  const query = useQuery({ queryKey, queryFn: fetchLocalGuides });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('local-guides')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'local_guides', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const saveGuide = useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: LocalGuideInput }) => {
      const supabase = createClient();
      const payload = { ...input, hotel_id: DEFAULT_HOTEL_ID };
      if (id) {
        const { data, error } = await supabase.from('local_guides').update(payload).eq('id', id).select('*').single();
        if (error) throw error;
        return data as LocalGuide;
      }
      const { data, error } = await supabase.from('local_guides').insert(payload).select('*').single();
      if (error) throw error;
      return data as LocalGuide;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteGuide = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('local_guides').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    guides: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    saveGuide,
    deleteGuide,
  };
}
