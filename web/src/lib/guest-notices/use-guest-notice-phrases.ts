'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { GuestNoticePhrase, GuestNoticePhraseInput } from '@/lib/guest-notices/types';

async function fetchGuestNoticePhrases(): Promise<GuestNoticePhrase[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('guest_notice_phrases')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('is_active', true)
    .order('sort_order')
    .order('title');
  if (error) throw error;
  return (data ?? []) as GuestNoticePhrase[];
}

async function persistPhraseOrder(orderedIds: string[]): Promise<void> {
  const supabase = createClient();
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('guest_notice_phrases')
      .update({ sort_order: (index + 1) * 10 })
      .eq('id', id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}

export function useGuestNoticePhrases() {
  const queryClient = useQueryClient();
  const queryKey = ['guest-notice-phrases', DEFAULT_HOTEL_ID] as const;

  const query = useQuery({ queryKey, queryFn: fetchGuestNoticePhrases });

  const savePhrase = useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: GuestNoticePhraseInput }) => {
      const supabase = createClient();
      const payload = { ...input, hotel_id: DEFAULT_HOTEL_ID };
      if (id) {
        const { data, error } = await supabase
          .from('guest_notice_phrases')
          .update(payload)
          .eq('id', id)
          .select('*')
          .single();
        if (error) throw error;
        return data as GuestNoticePhrase;
      }
      const existing = queryClient.getQueryData<GuestNoticePhrase[]>(queryKey) ?? [];
      const nextOrder = existing.length ? Math.max(...existing.map((row) => row.sort_order)) + 10 : 10;
      const { data, error } = await supabase
        .from('guest_notice_phrases')
        .insert({ ...payload, sort_order: input.sort_order ?? nextOrder })
        .select('*')
        .single();
      if (error) throw error;
      return data as GuestNoticePhrase;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deletePhrase = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('guest_notice_phrases').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const reorderPhrases = useMutation({
    mutationFn: (orderedIds: string[]) => persistPhraseOrder(orderedIds),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<GuestNoticePhrase[]>(queryKey);
      if (previous) {
        const map = new Map(previous.map((row) => [row.id, row]));
        const next = orderedIds.map((id) => map.get(id)).filter(Boolean) as GuestNoticePhrase[];
        queryClient.setQueryData(queryKey, next);
      }
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    phrases: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    savePhrase,
    deletePhrase,
    reorderPhrases,
  };
}
