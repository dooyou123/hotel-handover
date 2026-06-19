import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createServiceClient } from '@/lib/supabase/service';
import { hashDeliveryToken } from '@/lib/parcels/tokens';
import type { Parcel, ParcelSignPreview } from '@/lib/parcels/types';
import { normalizeParcel } from '@/lib/parcels/types';

export type ValidatedSignToken = {
  tokenId: string;
  parcel: Parcel;
  preview: ParcelSignPreview;
  staffName: string;
};

type TokenRow = {
  id: string;
  parcel_id: string;
  hotel_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_by: string;
};

export async function validateSignToken(token: string): Promise<ValidatedSignToken | null> {
  const supabase = createServiceClient();
  const tokenHash = hashDeliveryToken(token);

  const { data: tokenRow, error: tokenError } = await supabase
    .from('parcel_delivery_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (tokenError || !tokenRow) return null;

  const row = tokenRow as TokenRow;
  if (row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  const { data: parcelRow, error: parcelError } = await supabase
    .from('parcels')
    .select('*')
    .eq('id', row.parcel_id)
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .maybeSingle();

  if (parcelError || !parcelRow) return null;

  const parcel = normalizeParcel(parcelRow as Record<string, unknown>);
  if (parcel.status === 'delivered' || parcel.status === 'returned') return null;

  return {
    tokenId: row.id,
    parcel,
    preview: {
      direction: parcel.direction,
      room_number: parcel.room_number,
      reservation_number: parcel.reservation_number,
      guest_name: parcel.guest_name,
      check_in_date: parcel.check_in_date,
      checkout_date: parcel.checkout_date,
      storage_slot: parcel.storage_slot,
      description: parcel.description,
    },
    staffName: row.created_by,
  };
}

export async function markSignTokenUsed(tokenId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('parcel_delivery_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenId)
    .is('used_at', null);
  if (error) throw error;
}
