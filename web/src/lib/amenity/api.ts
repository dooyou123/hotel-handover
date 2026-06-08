import { createClient } from '@/lib/supabase/client';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { parseAmenityError } from '@/lib/amenity/errors';
import { calcSuggestedOrderBoxes, countRemainingBoxes } from '@/lib/amenity/reorder';
import {
  type Amenity,
  type AmenityInventoryRow,
  type AmenityTransaction,
  type AmenityTransactionType,
  type InventoryItem,
} from '@/lib/amenity/types';

function monthlyUsageStartIso(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export async function fetchAmenityInventoryData(hotelId = DEFAULT_HOTEL_ID) {
  const supabase = createClient();
  const usageStartIso = monthlyUsageStartIso();

  const [amenitiesRes, inventoryRes, transactionsRes, usageRes] = await Promise.all([
    supabase
      .from('amenities')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('sort_order'),
    supabase.from('amenity_inventory').select('*').eq('hotel_id', hotelId),
    supabase
      .from('amenity_transactions')
      .select('*, amenities(name)')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('amenity_transactions')
      .select('amenity_id, total_items')
      .eq('hotel_id', hotelId)
      .eq('type', '출고')
      .gte('created_at', usageStartIso),
  ]);

  if (amenitiesRes.error) throw amenitiesRes.error;
  if (inventoryRes.error) throw inventoryRes.error;
  if (transactionsRes.error) throw transactionsRes.error;
  if (usageRes.error) throw usageRes.error;

  const amenities = (amenitiesRes.data ?? []) as Amenity[];
  const inventory = (inventoryRes.data ?? []) as AmenityInventoryRow[];
  const transactions = (transactionsRes.data ?? []) as AmenityTransaction[];

  const inventoryMap = new Map(inventory.map((row) => [row.amenity_id, row.quantity]));
  const monthlyUsageMap = new Map<number, number>();
  for (const row of usageRes.data ?? []) {
    const id = row.amenity_id as number;
    monthlyUsageMap.set(id, (monthlyUsageMap.get(id) ?? 0) + (row.total_items as number));
  }

  const items: InventoryItem[] = amenities.map((amenity) => {
    const quantity = inventoryMap.get(amenity.id) ?? 0;
    const monthlyUsage = monthlyUsageMap.get(amenity.id) ?? 0;
    return {
      ...amenity,
      quantity,
      monthlyUsage,
      remainingBoxes: countRemainingBoxes(quantity, amenity.unit_size),
      orderBoxes: calcSuggestedOrderBoxes(quantity, monthlyUsage, amenity.box_size),
    };
  });

  return { items, transactions };
}

export async function addAmenityTransaction(params: {
  type: AmenityTransactionType;
  amenityId: number;
  quantity: number;
  author: string;
  memo?: string;
  hotelId?: string;
}) {
  const supabase = createClient();
  const hotelId = params.hotelId ?? DEFAULT_HOTEL_ID;

  const { data, error } = await supabase.rpc('add_amenity_transaction', {
    p_hotel_id: hotelId,
    p_type: params.type,
    p_amenity_id: params.amenityId,
    p_quantity: params.quantity,
    p_author: params.author,
    p_memo: params.memo ?? '',
  });

  if (error) throw new Error(parseAmenityError(error));
  return data as AmenityTransaction;
}

export async function updateAmenityTransaction(params: {
  transactionId: string;
  type: AmenityTransactionType;
  amenityId: number;
  quantity: number;
  author: string;
  memo?: string;
  hotelId?: string;
}) {
  const supabase = createClient();
  const hotelId = params.hotelId ?? DEFAULT_HOTEL_ID;

  const { data, error } = await supabase.rpc('update_amenity_transaction', {
    p_hotel_id: hotelId,
    p_transaction_id: params.transactionId,
    p_type: params.type,
    p_amenity_id: params.amenityId,
    p_quantity: params.quantity,
    p_author: params.author,
    p_memo: params.memo ?? '',
  });

  if (error) throw new Error(parseAmenityError(error));
  return data as AmenityTransaction;
}

export async function deleteAmenityTransaction(params: {
  transactionId: string;
  hotelId?: string;
}) {
  const supabase = createClient();
  const hotelId = params.hotelId ?? DEFAULT_HOTEL_ID;

  const { error } = await supabase.rpc('delete_amenity_transaction', {
    p_hotel_id: hotelId,
    p_transaction_id: params.transactionId,
  });

  if (error) throw new Error(parseAmenityError(error));
}

export function subscribeAmenityChanges(hotelId: string, onChange: () => void) {
  const supabase = createClient();
  const channel = supabase
    .channel(`amenity-${hotelId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'amenity_inventory', filter: `hotel_id=eq.${hotelId}` },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'amenity_transactions',
        filter: `hotel_id=eq.${hotelId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
