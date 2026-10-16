'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import {
  cancelProcurementOrder,
  createProcurementCategory,
  createProcurementItem,
  createProcurementOrder,
  deactivateProcurementCategory,
  deactivateProcurementItem,
  deleteProcurementOrder,
  restoreProcurementOrder,
  fetchProcurementCategories,
  fetchProcurementItems,
  fetchProcurementOrders,
  receiveAllOrderLines,
  receiveProcurementLine,
  unreceiveProcurementLine,
  updateProcurementCategory,
} from '@/lib/procurement/api';
import type {
  ProcurementCategoryInput,
  ProcurementItemInput,
  ProcurementOrderInput,
} from '@/lib/procurement/types';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

const categoriesKey = ['procurement-categories', DEFAULT_HOTEL_ID] as const;
const itemsKey = ['procurement-items', DEFAULT_HOTEL_ID] as const;
const ordersKey = ['procurement-orders', DEFAULT_HOTEL_ID] as const;

const pool = {
  channel: null as RealtimeChannel | null,
  listeners: new Set<QueryClient>(),
  subscribed: false,
  closing: false,
};

function notify() {
  pool.listeners.forEach((client) => {
    client.invalidateQueries({ queryKey: categoriesKey });
    client.invalidateQueries({ queryKey: itemsKey });
    client.invalidateQueries({ queryKey: ordersKey });
    client.invalidateQueries({ queryKey: ['procurement-overdue-count', DEFAULT_HOTEL_ID] });
  });
}

function ensureChannel(supabase: SupabaseClient) {
  if (pool.listeners.size === 0) return;
  if (pool.subscribed && pool.channel) return;
  if (pool.closing) return;

  const channel = supabase
    .channel(`procurement-${DEFAULT_HOTEL_ID}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'procurement_categories',
        filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}`,
      },
      notify,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'procurement_items', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
      notify,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'procurement_orders', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
      notify,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'procurement_order_lines',
        filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}`,
      },
      notify,
    )
    .subscribe((status) => {
      pool.subscribed = status === 'SUBSCRIBED';
    });

  pool.channel = channel;
}

function subscribeProcurement(queryClient: QueryClient) {
  const supabase = createClient();
  pool.listeners.add(queryClient);
  ensureChannel(supabase);

  return () => {
    pool.listeners.delete(queryClient);
    if (pool.listeners.size > 0) return;
    const channel = pool.channel;
    pool.channel = null;
    pool.subscribed = false;
    if (!channel) return;
    pool.closing = true;
    void supabase.removeChannel(channel).finally(() => {
      pool.closing = false;
    });
  };
}

export function useProcurement() {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: categoriesKey,
    queryFn: () => fetchProcurementCategories(true),
    staleTime: 30_000,
  });

  const itemsQuery = useQuery({
    queryKey: itemsKey,
    queryFn: () => fetchProcurementItems(true),
    staleTime: 15_000,
  });

  const ordersQuery = useQuery({
    queryKey: ordersKey,
    queryFn: fetchProcurementOrders,
    staleTime: 10_000,
  });

  useEffect(() => subscribeProcurement(queryClient), [queryClient]);

  const addCategory = useMutation({
    mutationFn: ({ input, createdBy }: { input: ProcurementCategoryInput; createdBy: string }) =>
      createProcurementCategory(input, createdBy),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKey }),
  });

  const renameCategory = useMutation({
    mutationFn: updateProcurementCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKey }),
  });

  const removeCategory = useMutation({
    mutationFn: deactivateProcurementCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKey }),
  });

  const addItem = useMutation({
    mutationFn: ({ input, createdBy }: { input: ProcurementItemInput; createdBy: string }) =>
      createProcurementItem(input, createdBy),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: itemsKey }),
  });

  const removeItem = useMutation({
    mutationFn: deactivateProcurementItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: itemsKey }),
  });

  const createOrder = useMutation({
    mutationFn: createProcurementOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ordersKey }),
  });

  const cancelOrder = useMutation({
    mutationFn: ({ orderId, cancelledBy }: { orderId: string; cancelledBy: string }) =>
      cancelProcurementOrder(orderId, cancelledBy),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ordersKey }),
  });

  const deleteOrder = useMutation({
    mutationFn: deleteProcurementOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ordersKey }),
  });

  const restoreOrder = useMutation({
    mutationFn: restoreProcurementOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ordersKey }),
  });

  const receiveLine = useMutation({
    mutationFn: receiveProcurementLine,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ordersKey }),
  });

  const unreceiveLine = useMutation({
    mutationFn: unreceiveProcurementLine,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ordersKey }),
  });

  const receiveAll = useMutation({
    mutationFn: receiveAllOrderLines,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ordersKey }),
  });

  return {
    categories: categoriesQuery.data ?? [],
    items: itemsQuery.data ?? [],
    orders: ordersQuery.data ?? [],
    isLoading: categoriesQuery.isLoading || itemsQuery.isLoading || ordersQuery.isLoading,
    error: categoriesQuery.error ?? itemsQuery.error ?? ordersQuery.error,
    addCategory,
    renameCategory,
    removeCategory,
    addItem,
    removeItem,
    createOrder,
    cancelOrder,
    deleteOrder,
    restoreOrder,
    receiveLine,
    unreceiveLine,
    receiveAll,
  };
}
