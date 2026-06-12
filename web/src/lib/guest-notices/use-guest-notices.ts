'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { GuestNotice, GuestNoticeInput, GuestNoticeLog } from '@/lib/guest-notices/types';

async function fetchGuestNotices(): Promise<GuestNotice[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('guest_notices')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('sort_order')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as GuestNotice[];
}

async function fetchNoticeLogs(noticeId: string): Promise<GuestNoticeLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('guest_notice_logs')
    .select('*')
    .eq('notice_id', noticeId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as GuestNoticeLog[];
}

export function useGuestNotices() {
  const queryClient = useQueryClient();
  const queryKey = ['guest-notices', DEFAULT_HOTEL_ID] as const;

  const query = useQuery({ queryKey, queryFn: fetchGuestNotices });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('guest-notices')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guest_notices', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const saveNotice = useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: GuestNoticeInput }) => {
      const supabase = createClient();
      const payload = { ...input, hotel_id: DEFAULT_HOTEL_ID };
      if (id) {
        const { data, error } = await supabase.from('guest_notices').update(payload).eq('id', id).select('*').single();
        if (error) throw error;
        return data as GuestNotice;
      }
      const { data, error } = await supabase.from('guest_notices').insert(payload).select('*').single();
      if (error) throw error;
      return data as GuestNotice;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteNotice = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('guest_notices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const logAction = useMutation({
    mutationFn: async (params: {
      noticeId: string;
      action: GuestNoticeLog['action'];
      staffName: string;
      workGroup: string;
      notes?: string;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('guest_notice_logs')
        .insert({
          hotel_id: DEFAULT_HOTEL_ID,
          notice_id: params.noticeId,
          action: params.action,
          staff_name: params.staffName,
          work_group: params.workGroup,
          notes: params.notes ?? '',
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as GuestNoticeLog;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['guest-notice-logs', variables.noticeId] });
    },
  });

  return {
    notices: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    saveNotice,
    deleteNotice,
    logAction,
    fetchNoticeLogs,
  };
}

export function useGuestNoticeLogs(noticeId: string | null) {
  return useQuery({
    queryKey: ['guest-notice-logs', noticeId],
    queryFn: () => fetchNoticeLogs(noticeId!),
    enabled: Boolean(noticeId),
  });
}
