'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { SopArticle, SopArticleInput } from '@/lib/sop/types';

async function fetchSopArticles(): Promise<SopArticle[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sop_articles')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('is_active', true)
    .order('is_pinned', { ascending: false })
    .order('sort_order')
    .order('title');

  if (error) throw error;
  return (data ?? []) as SopArticle[];
}

export function useSopArticles() {
  const queryClient = useQueryClient();
  const queryKey = ['sop-articles', DEFAULT_HOTEL_ID] as const;

  const query = useQuery({ queryKey, queryFn: fetchSopArticles });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('sop-articles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sop_articles', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const saveArticle = useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: SopArticleInput }) => {
      const supabase = createClient();
      if (id) {
        const { data, error } = await supabase
          .from('sop_articles')
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('*')
          .single();
        if (error) throw error;
        return data as SopArticle;
      }

      const { data, error } = await supabase
        .from('sop_articles')
        .insert({ ...input, hotel_id: DEFAULT_HOTEL_ID })
        .select('*')
        .single();
      if (error) throw error;
      return data as SopArticle;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteArticle = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('sop_articles').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    articles: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    saveArticle,
    deleteArticle,
  };
}
