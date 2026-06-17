'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { subscribeHotelEventsRealtime } from '@/lib/events/events-realtime';
import { monthDateRange } from '@/lib/schedule/month-range';
import type { HotelEvent, HotelEventInput, HotelEventPatch } from '@/lib/events/types';

function normalizeEvent(row: Record<string, unknown>): HotelEvent {
  return {
    ...(row as HotelEvent),
    completed_at: (row.completed_at as string | null) ?? null,
  };
}

async function fetchMonthEvents(month: string): Promise<HotelEvent[]> {
  const supabase = createClient();
  const { start, end } = monthDateRange(month);
  const { data, error } = await supabase
    .from('hotel_events')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .gte('event_date', start)
    .lte('event_date', end)
    .order('event_date')
    .order('start_time', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeEvent(row as Record<string, unknown>));
}

export function useMonthEvents(month: string) {
  const queryClient = useQueryClient();
  const queryKey = ['hotel-events', DEFAULT_HOTEL_ID, month] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => fetchMonthEvents(month),
    enabled: /^\d{4}-\d{2}$/.test(month),
  });

  useEffect(() => subscribeHotelEventsRealtime(queryClient), [queryClient]);

  const createEvent = useMutation({
    mutationFn: async (input: HotelEventInput) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('hotel_events')
        .insert({ ...input, hotel_id: DEFAULT_HOTEL_ID })
        .select('*')
        .single();
      if (error) throw error;
      return normalizeEvent(data as Record<string, unknown>);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hotel-events'] }),
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: HotelEventPatch }) => {
      const supabase = createClient();
      const { data, error } = await supabase.from('hotel_events').update(input).eq('id', id).select('*').single();
      if (error) throw error;
      return normalizeEvent(data as Record<string, unknown>);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hotel-events'] }),
  });

  const toggleEventComplete = useMutation({
    mutationFn: async (event: HotelEvent) => {
      const supabase = createClient();
      const completed_at = event.completed_at ? null : new Date().toISOString();
      const { data, error } = await supabase
        .from('hotel_events')
        .update({ completed_at })
        .eq('id', event.id)
        .select('*')
        .single();
      if (error) throw error;
      return normalizeEvent(data as Record<string, unknown>);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hotel-events'] }),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('hotel_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hotel-events'] }),
  });

  return {
    events: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createEvent,
    updateEvent,
    toggleEventComplete,
    deleteEvent,
  };
}
