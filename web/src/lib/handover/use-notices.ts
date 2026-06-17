'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { subscribeNoticesRealtime } from '@/lib/supabase/handover-realtime';
import type { Notice, NoticeInput, NoticeType } from '@/lib/handover/types';

function normalizeNotice(row: Record<string, unknown>): Notice {
  return {
    ...(row as Notice),
    completed_at: (row.completed_at as string | null) ?? null,
  };
}

export async function fetchNotices(): Promise<Notice[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => normalizeNotice(row as Record<string, unknown>));
}

export function useNotices() {
  const queryClient = useQueryClient();
  const queryKey = ['notices', DEFAULT_HOTEL_ID] as const;

  const query = useQuery({ queryKey, queryFn: fetchNotices });

  useEffect(() => subscribeNoticesRealtime(queryClient), [queryClient]);

  const createNotice = useMutation({
    mutationFn: async (input: NoticeInput) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('notices')
        .insert({ ...input, hotel_id: DEFAULT_HOTEL_ID })
        .select('*')
        .single();
      if (error) throw error;
      return normalizeNotice(data as Record<string, unknown>);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateNotice = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<NoticeInput> }) => {
      const supabase = createClient();
      const { data, error } = await supabase.from('notices').update(input).eq('id', id).select('*').single();
      if (error) throw error;
      return normalizeNotice(data as Record<string, unknown>);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteNotice = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('notices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('notices')
        .update({ is_pinned: !isPinned })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return normalizeNotice(data as Record<string, unknown>);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const toggleComplete = useMutation({
    mutationFn: async (notice: Notice) => {
      const supabase = createClient();
      const completed_at = notice.completed_at ? null : new Date().toISOString();
      const { data, error } = await supabase
        .from('notices')
        .update({ completed_at })
        .eq('id', notice.id)
        .select('*')
        .single();
      if (error) throw error;
      return normalizeNotice(data as Record<string, unknown>);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    notices: query.data ?? [],
    isLoading: query.isLoading,
    createNotice,
    updateNotice,
    deleteNotice,
    togglePin,
    toggleComplete,
  };
}

export function filterNoticesByType(notices: Notice[], type: NoticeType): Notice[] {
  return notices.filter((notice) => notice.type === type);
}
