'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { isLeaveSchemaMissing } from '@/lib/leave/schema';
import { monthDateRange } from '@/lib/schedule/month-range';
import type { LeaveRequest, LeaveRequestStatus } from '@/lib/leave/types';

async function fetchMonthLeaveRequests(month: string): Promise<LeaveRequest[]> {
  const supabase = createClient();
  const { start, end } = monthDateRange(month);
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .gte('leave_date', start)
    .lte('leave_date', end)
    .order('leave_date')
    .order('created_at');
  if (error) {
    if (isLeaveSchemaMissing(error)) return [];
    throw error;
  }
  return (data ?? []) as LeaveRequest[];
}

export function useMonthLeaveRequests(month: string) {
  const queryClient = useQueryClient();
  const queryKey = ['leave-requests', DEFAULT_HOTEL_ID, month] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => fetchMonthLeaveRequests(month),
    enabled: /^\d{4}-\d{2}$/.test(month),
  });

  useEffect(() => {
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    void supabase
      .from('leave_requests')
      .select('id')
      .limit(1)
      .then(({ error }) => {
        if (!active || isLeaveSchemaMissing(error)) return;
        channel = supabase
          .channel(`leave-requests-${month}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'leave_requests', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
            () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] }),
          )
          .subscribe();
      });

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient, month]);

  const submitRequest = useMutation({
    mutationFn: async (input: {
      staffName: string;
      workGroup: string;
      leaveDate: string;
      status: LeaveRequestStatus;
      isException: boolean;
      reason: string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.from('leave_requests').upsert(
        {
          hotel_id: DEFAULT_HOTEL_ID,
          staff_name: input.staffName,
          work_group: input.workGroup,
          leave_date: input.leaveDate,
          status: input.status,
          is_exception: input.isException,
          reason: input.reason,
          reviewed_by: null,
          reviewed_at: null,
        },
        { onConflict: 'hotel_id,staff_name,leave_date' },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] }),
  });

  const reviewRequest = useMutation({
    mutationFn: async (input: {
      id: string;
      status: Extract<LeaveRequestStatus, 'approved' | 'rejected'>;
      reviewedBy: string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: input.status,
          reviewed_by: input.reviewedBy,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] }),
  });

  const cancelRequest = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('leave_requests').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] }),
  });

  return {
    requests: query.data ?? [],
    isLoading: query.isLoading,
    submitRequest,
    reviewRequest,
    cancelRequest,
  };
}
