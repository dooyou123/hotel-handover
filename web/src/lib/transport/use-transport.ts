'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { TransportBooking, TransportBookingInput } from '@/lib/transport/types';

export function useTransportBookings(date: string) {
  const queryClient = useQueryClient();
  const queryKey = ['transport-bookings', DEFAULT_HOTEL_ID, date];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('transport_bookings')
        .select('*')
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .eq('booking_date', date)
        .order('pickup_time');
      if (error) throw error;
      return (data ?? []) as TransportBooking[];
    },
  });

  const createBooking = useMutation({
    mutationFn: async (input: TransportBookingInput) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('transport_bookings')
        .insert({ ...input, hotel_id: DEFAULT_HOTEL_ID })
        .select('*')
        .single();
      if (error) throw error;
      return data as TransportBooking;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateBooking = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<TransportBookingInput> }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('transport_bookings')
        .update(input)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as TransportBooking;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteBooking = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('transport_bookings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
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
