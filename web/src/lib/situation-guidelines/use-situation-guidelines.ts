'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { SituationGuideline, SituationGuidelineInput } from '@/lib/situation-guidelines/types';

async function fetchSituationGuidelines(): Promise<SituationGuideline[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('situation_guidelines')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('is_active', true)
    .order('is_pinned', { ascending: false })
    .order('sort_order')
    .order('title');
  if (error) throw error;
  return (data ?? []) as SituationGuideline[];
}

export function useSituationGuidelines() {
  const queryClient = useQueryClient();
  const queryKey = ['situation-guidelines', DEFAULT_HOTEL_ID] as const;

  const query = useQuery({ queryKey, queryFn: fetchSituationGuidelines });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('situation-guidelines')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'situation_guidelines',
          filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}`,
        },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const saveGuideline = useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: SituationGuidelineInput }) => {
      const supabase = createClient();
      const payload = { ...input, hotel_id: DEFAULT_HOTEL_ID };
      if (id) {
        const { data, error } = await supabase
          .from('situation_guidelines')
          .update(payload)
          .eq('id', id)
          .select('*')
          .single();
        if (error) throw error;
        return data as SituationGuideline;
      }
      const { data, error } = await supabase
        .from('situation_guidelines')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return data as SituationGuideline;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteGuideline = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('situation_guidelines')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('situation_guidelines')
        .update({ is_pinned: !isPinned })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as SituationGuideline;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    guidelines: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    saveGuideline,
    deleteGuideline,
    togglePin,
  };
}
