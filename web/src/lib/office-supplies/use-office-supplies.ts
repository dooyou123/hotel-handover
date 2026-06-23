import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { resolveActiveBatchKey } from '@/lib/office-supplies/batch';
import {
  normalizeOfficeSupplyBatch,
  normalizeOfficeSupplyCatalogItem,
  normalizeOfficeSupplyRequest,
  type OfficeSupplyCatalogItem,
  type OfficeSupplyRequest,
  type OfficeSupplyRequestInput,
} from '@/lib/office-supplies/types';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

export function officeSuppliesQueryKey(batchKey?: string) {
  return ['office-supplies', DEFAULT_HOTEL_ID, batchKey ?? 'active'] as const;
}

async function fetchSubmittedBatchKeys(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('office_supply_batches')
    .select('batch_key')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('status', 'submitted');
  if (error) throw error;
  return (data ?? []).map((row) => String(row.batch_key));
}

async function ensureActiveBatch(batchKey: string) {
  const supabase = createClient();
  const { data: existing, error: selectError } = await supabase
    .from('office_supply_batches')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('batch_key', batchKey)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return normalizeOfficeSupplyBatch(existing as Record<string, unknown>);

  const { data, error } = await supabase
    .from('office_supply_batches')
    .insert({
      hotel_id: DEFAULT_HOTEL_ID,
      batch_key: batchKey,
      order_date: batchKey,
      status: 'open',
    })
    .select('*')
    .single();
  if (error) throw error;
  return normalizeOfficeSupplyBatch(data as Record<string, unknown>);
}

async function fetchOfficeSupplyBundle() {
  const submittedKeys = await fetchSubmittedBatchKeys();
  const activeBatchKey = resolveActiveBatchKey(submittedKeys);
  const batch = await ensureActiveBatch(activeBatchKey);
  const supabase = createClient();

  const [catalogResult, requestsResult] = await Promise.all([
    supabase
      .from('office_supply_catalog')
      .select('*')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .order('order_count', { ascending: false })
      .order('product_name', { ascending: true }),
    supabase
      .from('office_supply_requests')
      .select('*')
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('batch_id', batch.id)
      .order('created_at', { ascending: false }),
  ]);

  if (catalogResult.error) throw catalogResult.error;
  if (requestsResult.error) throw requestsResult.error;

  return {
    batch,
    activeBatchKey,
    catalog: (catalogResult.data ?? []).map((row) =>
      normalizeOfficeSupplyCatalogItem(row as Record<string, unknown>),
    ),
    requests: (requestsResult.data ?? []).map((row) =>
      normalizeOfficeSupplyRequest(row as Record<string, unknown>),
    ),
  };
}

async function ensureCatalogEntry(
  supabase: ReturnType<typeof createClient>,
  catalog: OfficeSupplyCatalogItem[],
  input: OfficeSupplyRequestInput,
) {
  const existing = catalog.find((item) => item.product_code === input.product_code);
  if (!existing) {
    const { error } = await supabase.from('office_supply_catalog').insert({
      hotel_id: DEFAULT_HOTEL_ID,
      product_code: input.product_code,
      product_name: input.product_name,
      image_url: input.image_url ?? '',
      unit: input.unit ?? '개',
      category_id: input.category_id ?? '',
      goods_id: input.goods_id ?? '',
      order_count: 0,
    });
    if (error) throw error;
    return;
  }

  const patch: Record<string, string> = {};
  if (input.category_id && !existing.category_id) patch.category_id = input.category_id;
  if (input.goods_id && !existing.goods_id) patch.goods_id = input.goods_id;
  if (input.image_url && !existing.image_url) patch.image_url = input.image_url;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from('office_supply_catalog').update(patch).eq('id', existing.id);
  if (error) throw error;
}

export function useOfficeSupplies() {
  const queryClient = useQueryClient();
  const queryKey = officeSuppliesQueryKey();

  const query = useQuery({
    queryKey,
    queryFn: fetchOfficeSupplyBundle,
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`office-supplies-${DEFAULT_HOTEL_ID}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'office_supply_requests', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['office-supplies', DEFAULT_HOTEL_ID] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'office_supply_batches', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['office-supplies', DEFAULT_HOTEL_ID] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'office_supply_catalog', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['office-supplies', DEFAULT_HOTEL_ID] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const addRequest = useMutation({
    mutationFn: async (input: OfficeSupplyRequestInput) => {
      const bundle = query.data ?? (await fetchOfficeSupplyBundle());
      const supabase = createClient();
      const { data, error } = await supabase
        .from('office_supply_requests')
        .insert({
          hotel_id: DEFAULT_HOTEL_ID,
          batch_id: bundle.batch.id,
          product_code: input.product_code,
          product_name: input.product_name,
          image_url: input.image_url ?? '',
          unit: input.unit ?? '개',
          quantity: input.quantity,
          note: input.note ?? '',
          requested_by: input.requested_by,
        })
        .select('*')
        .single();
      if (error) throw error;
      await ensureCatalogEntry(supabase, bundle.catalog, input);
      return normalizeOfficeSupplyRequest(data as Record<string, unknown>);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['office-supplies', DEFAULT_HOTEL_ID] }),
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, quantity, note }: { id: string; quantity: number; note?: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('office_supply_requests')
        .update({ quantity, note: note ?? '' })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return normalizeOfficeSupplyRequest(data as Record<string, unknown>);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['office-supplies', DEFAULT_HOTEL_ID] }),
  });

  const deleteRequest = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('office_supply_requests').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['office-supplies', DEFAULT_HOTEL_ID] }),
  });

  const submitBatch = useMutation({
    mutationFn: async (submittedBy: string) => {
      const bundle = query.data ?? (await fetchOfficeSupplyBundle());
      if (bundle.batch.status === 'submitted') {
        throw new Error('이미 제출된 회차입니다.');
      }

      const supabase = createClient();
      const submittedAt = new Date().toISOString();
      const { error: batchError } = await supabase
        .from('office_supply_batches')
        .update({
          status: 'submitted',
          submitted_at: submittedAt,
          submitted_by: submittedBy,
        })
        .eq('id', bundle.batch.id);
      if (batchError) throw batchError;

      const totals = new Map<string, { request: (typeof bundle.requests)[number]; quantity: number }>();
      for (const item of bundle.requests) {
        const current = totals.get(item.product_code);
        if (current) {
          current.quantity += item.quantity;
        } else {
          totals.set(item.product_code, { request: item, quantity: item.quantity });
        }
      }

      for (const { request, quantity } of totals.values()) {
        const existing = bundle.catalog.find((item) => item.product_code === request.product_code);
        if (existing) {
          const { error } = await supabase
            .from('office_supply_catalog')
            .update({ order_count: existing.order_count + quantity })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('office_supply_catalog').insert({
            hotel_id: DEFAULT_HOTEL_ID,
            product_code: request.product_code,
            product_name: request.product_name,
            image_url: request.image_url,
            unit: request.unit,
            order_count: quantity,
          });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['office-supplies', DEFAULT_HOTEL_ID] }),
  });

  const setCatalogPinned = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('office_supply_catalog')
        .update({ is_pinned: isPinned })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return normalizeOfficeSupplyCatalogItem(data as Record<string, unknown>);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['office-supplies', DEFAULT_HOTEL_ID] }),
  });

  return {
    batch: query.data?.batch ?? null,
    activeBatchKey: query.data?.activeBatchKey ?? null,
    catalog: query.data?.catalog ?? ([] as OfficeSupplyCatalogItem[]),
    requests: query.data?.requests ?? ([] as OfficeSupplyRequest[]),
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addRequest,
    updateRequest,
    deleteRequest,
    submitBatch,
    setCatalogPinned,
  };
}
