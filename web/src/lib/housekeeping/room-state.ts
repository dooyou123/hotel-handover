import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { HousekeepingBedDraft, HkBedType } from '@/lib/housekeeping/types';
import { getEffectiveBedType, type BedRoomBaseline } from '@/lib/housekeeping/baseline';

export type RoomBedState = Record<string, HkBedType>;

export async function fetchRoomBedState(): Promise<RoomBedState> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('housekeeping_room_bed_state')
    .select('room_number, bed_type')
    .eq('hotel_id', DEFAULT_HOTEL_ID);

  if (error) throw error;

  const state: RoomBedState = {};
  for (const row of data ?? []) {
    if (row.bed_type) {
      state[row.room_number as string] = row.bed_type as HkBedType;
    }
  }
  return state;
}

export async function upsertRoomBedStateFromRooms(
  rooms: HousekeepingBedDraft[],
  baseline: BedRoomBaseline,
  roomState: RoomBedState,
): Promise<void> {
  const supabase = createClient();
  const rows: { hotel_id: string; room_number: string; bed_type: 'twin' | 'triple' }[] = [];
  for (const room of rooms) {
    const bedType = getEffectiveBedType(room, { baseline, roomState });
    if (bedType !== 'twin' && bedType !== 'triple') continue;
    rows.push({
      hotel_id: DEFAULT_HOTEL_ID,
      room_number: room.room_number.trim(),
      bed_type: bedType,
    });
  }

  if (!rows.length) return;

  const { error } = await supabase.from('housekeeping_room_bed_state').upsert(rows, {
    onConflict: 'hotel_id,room_number',
  });
  if (error) throw error;
}
