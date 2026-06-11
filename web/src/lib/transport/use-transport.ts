'use client';

import { useEffect } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isSupabaseNetworkError } from '@/lib/supabase/env';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { todayDateString } from '@/lib/handover/shift-summary';
import { createClient } from '@/lib/supabase/client';
import {
  normalizeTransportRow,
  toTransportBookingDbPayload,
  type TransportBooking,
  type TransportBookingInput,
} from '@/lib/transport/types';

export type TransportDateRange = {
  from: string;
  to: string;
};

export function transportBookingsQueryKey(range: TransportDateRange) {
  return ['transport-bookings', DEFAULT_HOTEL_ID, range.from, range.to] as const;
}

async function fetchTransportBookings(range: TransportDateRange): Promise<TransportBooking[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('transport_bookings')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .gte('booking_date', range.from)
    .lte('booking_date', range.to)
    .order('booking_date')
    .order('pickup_time');
  if (error) throw error;
  return (data ?? []).map((row) => normalizeTransportRow(row as Record<string, unknown>));
}

export function useTransportBookings(range: TransportDateRange) {
  const queryClient = useQueryClient();
  const queryKey = transportBookingsQueryKey(range);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTransportBookings(range),
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => isSupabaseNetworkError(error) && failureCount < 2,
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`transport-bookings-${DEFAULT_HOTEL_ID}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transport_bookings',
          filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['transport-bookings', DEFAULT_HOTEL_ID] });
          void queryClient.invalidateQueries({ queryKey: ['transport-today-pending', DEFAULT_HOTEL_ID] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createBooking = useMutation({
    mutationFn: async (input: TransportBookingInput) => {
      const supabase = createClient();
      const payload = toTransportBookingDbPayload(input, { hotelId: DEFAULT_HOTEL_ID });
      const { data, error } = await supabase
        .from('transport_bookings')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return normalizeTransportRow(data as Record<string, unknown>);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transport-bookings', DEFAULT_HOTEL_ID] }),
  });

  const updateBooking = useMutation({
    mutationFn: async ({
      id,
      input,
      updatedBy,
    }: {
      id: string;
      input: Partial<TransportBookingInput>;
      updatedBy?: string;
    }) => {
      const supabase = createClient();
      const payload = toTransportBookingDbPayload(input, { updatedBy });
      const { data, error } = await supabase
        .from('transport_bookings')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return normalizeTransportRow(data as Record<string, unknown>);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transport-bookings', DEFAULT_HOTEL_ID] }),
  });

  const deleteBooking = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('transport_bookings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transport-bookings', DEFAULT_HOTEL_ID] }),
  });

  return {
    bookings: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createBooking,
    updateBooking,
    deleteBooking,
  };
}

/** 당일 단일 날짜 조회 (레거시·알림용) */
export function useTransportBookingsForDate(date: string) {
  return useTransportBookings({ from: date, to: date });
}

/** 오늘 택시 예약 (메인 사이드바·알림) */
export function useTodayTaxiBookings() {
  const today = todayDateString();
  return useQuery({
    queryKey: ['transport-bookings-today', DEFAULT_HOTEL_ID, today],
    queryFn: () => fetchTransportBookings({ from: today, to: today }),
    refetchInterval: 60_000,
  });
}
