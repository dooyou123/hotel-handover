'use client';

import type { QueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

type Listener = () => void;

type ChannelPool = {
  channel: RealtimeChannel | null;
  listeners: Set<Listener>;
};

const eventsPool: ChannelPool = { channel: null, listeners: new Set() };

function notify(pool: ChannelPool) {
  pool.listeners.forEach((listener) => listener());
}

function teardownPool(supabase: SupabaseClient, pool: ChannelPool) {
  if (pool.channel) {
    supabase.removeChannel(pool.channel);
    pool.channel = null;
  }
}

function ensureEventsChannel(supabase: SupabaseClient) {
  if (eventsPool.channel) return;

  eventsPool.channel = supabase
    .channel('hotel-events')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'hotel_events', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
      () => notify(eventsPool),
    )
    .subscribe();
}

export function subscribeHotelEventsRealtime(queryClient: QueryClient): () => void {
  const supabase = createClient();
  const listener = () => {
    queryClient.invalidateQueries({ queryKey: ['hotel-events'] });
  };

  eventsPool.listeners.add(listener);
  ensureEventsChannel(supabase);

  return () => {
    eventsPool.listeners.delete(listener);
    if (eventsPool.listeners.size === 0) {
      teardownPool(supabase, eventsPool);
    }
  };
}
