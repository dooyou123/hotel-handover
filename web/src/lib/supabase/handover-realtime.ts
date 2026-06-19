'use client';

import type { QueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

type Listener = () => void;

type PostgresBinding = {
  event: '*';
  schema: 'public';
  table: string;
  filter?: string;
};

type ChannelPool = {
  channel: RealtimeChannel | null;
  listeners: Set<Listener>;
  subscribed: boolean;
  closing: boolean;
  retryTimer: ReturnType<typeof setTimeout> | null;
  channelName: string;
  bindings: PostgresBinding[];
};

const cardsPool: ChannelPool = {
  channel: null,
  listeners: new Set(),
  subscribed: false,
  closing: false,
  retryTimer: null,
  channelName: 'handover-cards',
  bindings: [
    {
      event: '*',
      schema: 'public',
      table: 'cards',
      filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}`,
    },
    { event: '*', schema: 'public', table: 'card_acknowledgments' },
    { event: '*', schema: 'public', table: 'card_comments' },
    { event: '*', schema: 'public', table: 'card_attachments' },
  ],
};

const noticesPool: ChannelPool = {
  channel: null,
  listeners: new Set(),
  subscribed: false,
  closing: false,
  retryTimer: null,
  channelName: 'handover-notices',
  bindings: [
    {
      event: '*',
      schema: 'public',
      table: 'notices',
      filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}`,
    },
  ],
};

function notify(pool: ChannelPool) {
  pool.listeners.forEach((listener) => listener());
}

function clearRetry(pool: ChannelPool) {
  if (pool.retryTimer) {
    clearTimeout(pool.retryTimer);
    pool.retryTimer = null;
  }
}

function removePoolChannel(supabase: SupabaseClient, pool: ChannelPool): Promise<void> {
  const channel = pool.channel;
  pool.channel = null;
  pool.subscribed = false;
  if (!channel) return Promise.resolve();

  pool.closing = true;
  return supabase.removeChannel(channel).then(() => {
    pool.closing = false;
  });
}

function teardownPool(supabase: SupabaseClient, pool: ChannelPool) {
  clearRetry(pool);
  void removePoolChannel(supabase, pool);
}

function scheduleReconnect(supabase: SupabaseClient, pool: ChannelPool) {
  if (pool.listeners.size === 0 || pool.retryTimer || pool.closing) return;
  pool.retryTimer = setTimeout(() => {
    pool.retryTimer = null;
    ensurePoolChannel(supabase, pool);
  }, 3000);
}

function failPoolChannel(supabase: SupabaseClient, pool: ChannelPool) {
  pool.subscribed = false;
  clearRetry(pool);
  const channel = pool.channel;
  pool.channel = null;
  if (!channel) {
    scheduleReconnect(supabase, pool);
    return;
  }

  pool.closing = true;
  void supabase.removeChannel(channel).finally(() => {
    pool.closing = false;
    if (pool.listeners.size > 0) scheduleReconnect(supabase, pool);
  });
}

function ensurePoolChannel(supabase: SupabaseClient, pool: ChannelPool) {
  if (pool.listeners.size === 0) return;
  if (pool.subscribed && pool.channel) return;

  if (pool.closing) {
    scheduleReconnect(supabase, pool);
    return;
  }

  clearRetry(pool);

  if (pool.channel) {
    void removePoolChannel(supabase, pool).then(() => {
      if (pool.listeners.size > 0) ensurePoolChannel(supabase, pool);
    });
    return;
  }

  let channel = supabase.channel(pool.channelName);
  for (const binding of pool.bindings) {
    channel = channel.on('postgres_changes', binding, () => notify(pool));
  }

  pool.channel = channel;
  pool.subscribed = false;
  channel.subscribe((status) => {
    if (pool.closing) return;

    if (status === 'SUBSCRIBED') {
      pool.subscribed = true;
      return;
    }

    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      failPoolChannel(supabase, pool);
      return;
    }

    if (status === 'CLOSED' && pool.listeners.size > 0) {
      failPoolChannel(supabase, pool);
    }
  });
}

function ensureCardsChannel(supabase: SupabaseClient) {
  ensurePoolChannel(supabase, cardsPool);
}

function ensureNoticesChannel(supabase: SupabaseClient) {
  ensurePoolChannel(supabase, noticesPool);
}

export function invalidateCardQueries(queryClient: QueryClient) {
  void queryClient.refetchQueries({ queryKey: ['cards', DEFAULT_HOTEL_ID], type: 'active' });
  void queryClient.refetchQueries({ queryKey: ['archived-cards', DEFAULT_HOTEL_ID], type: 'active' });
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
    void queryClient.refetchQueries({ queryKey: ['notices', DEFAULT_HOTEL_ID], type: 'active' });
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

export function subscribeHandoverRealtime(queryClient: QueryClient): () => void {
  const unsubscribeCards = subscribeCardsRealtime(queryClient);
  const unsubscribeNotices = subscribeNoticesRealtime(queryClient);
  return () => {
    unsubscribeCards();
    unsubscribeNotices();
  };
}
