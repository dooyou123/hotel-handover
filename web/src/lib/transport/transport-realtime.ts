'use client';

import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { transportTodayPendingQueryKey } from '@/lib/transport/transport-query-keys';

const transportRealtimePool = {
  listeners: new Set<QueryClient>(),
  channel: null as RealtimeChannel | null,
  subscribed: false,
  closing: false,
  retryTimer: null as ReturnType<typeof setTimeout> | null,
};

function invalidateTransportQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['transport-bookings', DEFAULT_HOTEL_ID] });
  void queryClient.invalidateQueries({ queryKey: transportTodayPendingQueryKey });
  void queryClient.invalidateQueries({ queryKey: ['transport-bookings-today', DEFAULT_HOTEL_ID] });
}

function notifyTransportListeners() {
  transportRealtimePool.listeners.forEach((client) => invalidateTransportQueries(client));
}

function clearTransportRetry() {
  if (transportRealtimePool.retryTimer) {
    clearTimeout(transportRealtimePool.retryTimer);
    transportRealtimePool.retryTimer = null;
  }
}

function scheduleTransportReconnect(supabase: SupabaseClient) {
  if (
    transportRealtimePool.listeners.size === 0 ||
    transportRealtimePool.retryTimer ||
    transportRealtimePool.closing
  ) {
    return;
  }
  transportRealtimePool.retryTimer = setTimeout(() => {
    transportRealtimePool.retryTimer = null;
    ensureTransportBookingsChannel(supabase);
  }, 3000);
}

function tearDownTransportChannel(supabase: SupabaseClient) {
  transportRealtimePool.closing = true;
  clearTransportRetry();
  if (transportRealtimePool.channel) {
    void supabase.removeChannel(transportRealtimePool.channel);
    transportRealtimePool.channel = null;
  }
  transportRealtimePool.subscribed = false;
  transportRealtimePool.closing = false;
}

function ensureTransportBookingsChannel(supabase: SupabaseClient) {
  if (transportRealtimePool.subscribed || transportRealtimePool.channel) return;

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
      () => notifyTransportListeners(),
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        transportRealtimePool.subscribed = true;
        clearTransportRetry();
        return;
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        transportRealtimePool.subscribed = false;
        if (transportRealtimePool.channel) {
          void supabase.removeChannel(transportRealtimePool.channel);
          transportRealtimePool.channel = null;
        }
        scheduleTransportReconnect(supabase);
      }
    });

  transportRealtimePool.channel = channel;
}

export function useTransportBookingsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    transportRealtimePool.listeners.add(queryClient);
    ensureTransportBookingsChannel(supabase);

    return () => {
      transportRealtimePool.listeners.delete(queryClient);
      if (transportRealtimePool.listeners.size === 0) {
        tearDownTransportChannel(supabase);
      }
    };
  }, [queryClient]);
}
