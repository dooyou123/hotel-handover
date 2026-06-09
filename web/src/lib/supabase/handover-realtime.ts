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

const cardsPool: ChannelPool = { channel: null, listeners: new Set() };
const noticesPool: ChannelPool = { channel: null, listeners: new Set() };

function notify(pool: ChannelPool) {
  pool.listeners.forEach((listener) => listener());
}

function teardownPool(supabase: SupabaseClient, pool: ChannelPool) {
  if (pool.channel) {
    supabase.removeChannel(pool.channel);
    pool.channel = null;
  }
}

function ensureCardsChannel(supabase: SupabaseClient) {
  if (poolHasChannel(cardsPool)) return;

  cardsPool.channel = supabase
    .channel('handover-cards')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cards', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
      () => notify(cardsPool),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'card_acknowledgments' }, () =>
      notify(cardsPool),
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'card_comments' }, () => notify(cardsPool))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'card_attachments' }, () => notify(cardsPool))
    .subscribe();
}

function ensureNoticesChannel(supabase: SupabaseClient) {
  if (poolHasChannel(noticesPool)) return;

  noticesPool.channel = supabase
    .channel('handover-notices')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notices', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
      () => notify(noticesPool),
    )
    .subscribe();
}

function poolHasChannel(pool: ChannelPool): boolean {
  return pool.channel !== null;
}

export function invalidateCardQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['cards', DEFAULT_HOTEL_ID] });
  queryClient.invalidateQueries({ queryKey: ['archived-cards', DEFAULT_HOTEL_ID] });
}

export function subscribeCardsRealtime(queryClient: QueryClient): () => void {
  const supabase = createClient();
  const listener = () => invalidateCardQueries(queryClient);

  cardsPool.listeners.add(listener);
  ensureCardsChannel(supabase);

  return () => {
    cardsPool.listeners.delete(listener);
    if (cardsPool.listeners.size === 0) {
      teardownPool(supabase, cardsPool);
    }
  };
}

export function subscribeNoticesRealtime(queryClient: QueryClient): () => void {
  const supabase = createClient();
  const listener = () => {
    queryClient.invalidateQueries({ queryKey: ['notices', DEFAULT_HOTEL_ID] });
  };

  noticesPool.listeners.add(listener);
  ensureNoticesChannel(supabase);

  return () => {
    noticesPool.listeners.delete(listener);
    if (noticesPool.listeners.size === 0) {
      teardownPool(supabase, noticesPool);
    }
  };
}
