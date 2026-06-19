'use client';

import { useEffect } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseNetworkError } from '@/lib/supabase/env';
import {
  emptyParcelInput,
  normalizeParcel,
  type Parcel,
  type ParcelInput,
  type ParcelStatus,
} from '@/lib/parcels/types';

export type ParcelStatusFilter = 'all' | ParcelStatus | 'overdue';

export function parcelsQueryKey(filter: ParcelStatusFilter) {
  return ['parcels', DEFAULT_HOTEL_ID, filter] as const;
}

async function fetchParcels(): Promise<Parcel[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('parcels')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('received_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeParcel(row as Record<string, unknown>));
}

export function useParcels(statusFilter: ParcelStatusFilter = 'all') {
  const queryClient = useQueryClient();
  const queryKey = parcelsQueryKey(statusFilter);

  const query = useQuery({
    queryKey,
    queryFn: fetchParcels,
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => isSupabaseNetworkError(error) && failureCount < 2,
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`parcels-${DEFAULT_HOTEL_ID}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parcels', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
        () => {
          void queryClient.refetchQueries({ queryKey: ['parcels', DEFAULT_HOTEL_ID] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createParcel = useMutation({
    mutationFn: async (input: ParcelInput) => {
      const supabase = createClient();
      const payload = {
        ...input,
        hotel_id: DEFAULT_HOTEL_ID,
        checkout_date: input.checkout_date.trim() || null,
        check_in_date: input.check_in_date.trim() || null,
        reservation_number: input.reservation_number.trim(),
      };
      const { data, error } = await supabase.from('parcels').insert(payload).select('*').single();
      if (error) throw error;
      return normalizeParcel(data as Record<string, unknown>);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parcels', DEFAULT_HOTEL_ID] }),
  });

  const updateParcel = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<ParcelInput> }) => {
      const supabase = createClient();
      const patch: Record<string, unknown> = { ...input };
      if (input.checkout_date !== undefined) {
        patch.checkout_date = input.checkout_date.trim() || null;
      }
      if (input.check_in_date !== undefined) {
        patch.check_in_date = input.check_in_date.trim() || null;
      }
      if (input.reservation_number !== undefined) {
        patch.reservation_number = input.reservation_number.trim();
      }
      if (input.status === 'delivered') {
        patch.delivered_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from('parcels')
        .update(patch)
        .eq('id', id)
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .select('*')
        .single();
      if (error) throw error;
      return normalizeParcel(data as Record<string, unknown>);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parcels', DEFAULT_HOTEL_ID] }),
  });

  const deleteParcel = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('parcels').delete().eq('id', id).eq('hotel_id', DEFAULT_HOTEL_ID);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parcels', DEFAULT_HOTEL_ID] }),
  });

  return {
    parcels: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createParcel,
    updateParcel,
    deleteParcel,
    emptyInput: emptyParcelInput,
  };
}
