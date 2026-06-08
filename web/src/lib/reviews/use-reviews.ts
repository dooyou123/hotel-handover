'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { GuestReview, GuestReviewInput } from '@/lib/reviews/types';

async function fetchReviews(): Promise<GuestReview[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('guest_reviews')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('is_active', true)
    .order('check_in_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as GuestReview[];
}

export function useReviews() {
  const queryClient = useQueryClient();
  const queryKey = ['guest-reviews', DEFAULT_HOTEL_ID] as const;

  const query = useQuery({ queryKey, queryFn: fetchReviews });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('guest-reviews')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guest_reviews', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createReview = useMutation({
    mutationFn: async (input: GuestReviewInput) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('guest_reviews')
        .insert({ ...input, hotel_id: DEFAULT_HOTEL_ID })
        .select('*')
        .single();
      if (error) throw error;
      return data as GuestReview;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateReview = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: GuestReviewInput }) => {
      const supabase = createClient();
      const { data, error } = await supabase.from('guest_reviews').update(input).eq('id', id).select('*').single();
      if (error) throw error;
      return data as GuestReview;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('guest_reviews').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    reviews: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createReview,
    updateReview,
    deleteReview,
  };
}
