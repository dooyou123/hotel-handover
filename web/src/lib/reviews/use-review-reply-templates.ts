'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { ReviewReplyTemplate, ReviewReplyTemplateInput } from '@/lib/reviews/reply-templates';

async function fetchReviewReplyTemplates(): Promise<ReviewReplyTemplate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('review_reply_templates')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('is_active', true)
    .order('sort_order')
    .order('title');
  if (error) throw error;
  return (data ?? []) as ReviewReplyTemplate[];
}

async function persistTemplateOrder(orderedIds: string[]): Promise<void> {
  const supabase = createClient();
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('review_reply_templates')
      .update({ sort_order: (index + 1) * 10 })
      .eq('id', id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}

export function useReviewReplyTemplates() {
  const queryClient = useQueryClient();
  const queryKey = ['review-reply-templates', DEFAULT_HOTEL_ID] as const;

  const query = useQuery({ queryKey, queryFn: fetchReviewReplyTemplates });

  const saveTemplate = useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: ReviewReplyTemplateInput }) => {
      const supabase = createClient();
      const payload = { ...input, hotel_id: DEFAULT_HOTEL_ID };
      if (id) {
        const { data, error } = await supabase
          .from('review_reply_templates')
          .update(payload)
          .eq('id', id)
          .select('*')
          .single();
        if (error) throw error;
        return data as ReviewReplyTemplate;
      }
      const existing = queryClient.getQueryData<ReviewReplyTemplate[]>(queryKey) ?? [];
      const nextOrder = existing.length ? Math.max(...existing.map((row) => row.sort_order)) + 10 : 10;
      const { data, error } = await supabase
        .from('review_reply_templates')
        .insert({ ...payload, sort_order: input.sort_order ?? nextOrder })
        .select('*')
        .single();
      if (error) throw error;
      return data as ReviewReplyTemplate;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('review_reply_templates')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const reorderTemplates = useMutation({
    mutationFn: (orderedIds: string[]) => persistTemplateOrder(orderedIds),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ReviewReplyTemplate[]>(queryKey);
      if (previous) {
        const map = new Map(previous.map((row) => [row.id, row]));
        const next = orderedIds.map((id) => map.get(id)).filter(Boolean) as ReviewReplyTemplate[];
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
    templates: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    saveTemplate,
    deleteTemplate,
    reorderTemplates,
  };
}
