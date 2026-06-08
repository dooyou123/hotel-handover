import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { HousekeepingBedDraft, HkBedType } from '@/lib/housekeeping/types';

export type BedRoomBaseline = Record<string, HkBedType>;

/** 오늘 이전 리포트에서 객실별 최근 트윈/트리플 설정을 가져옵니다. */
export async function fetchBedRoomBaseline(beforeDate: string): Promise<BedRoomBaseline> {
  const supabase = createClient();
  const { data: reports, error } = await supabase
    .from('housekeeping_reports')
    .select('work_date, housekeeping_report_rooms(room_number, room_type, row_kind)')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .lt('work_date', beforeDate)
    .order('work_date', { ascending: false })
    .limit(90);

  if (error) throw error;

  const baseline: BedRoomBaseline = {};

  for (const report of reports ?? []) {
    const rooms = Array.isArray(report.housekeeping_report_rooms)
      ? report.housekeeping_report_rooms
      : report.housekeeping_report_rooms
        ? [report.housekeeping_report_rooms]
        : [];

    for (const room of rooms) {
      if (room.row_kind !== 'bed' || !room.room_type || baseline[room.room_number]) continue;
      baseline[room.room_number] = room.room_type as HkBedType;
    }
  }

  return baseline;
}

export function getEffectiveBedType(
  room: Pick<HousekeepingBedDraft, 'room_number' | 'room_type'>,
  baseline: BedRoomBaseline,
): HkBedType {
  return room.room_type || baseline[room.room_number] || '';
}

export function isBedRoomChangedToday(
  room: HousekeepingBedDraft,
  baseline: BedRoomBaseline,
): boolean {
  const base = baseline[room.room_number] || '';
  return Boolean(room.extra_bed_action || (room.room_type && room.room_type !== base));
}

export function filterBedRoomsToSave(
  rooms: HousekeepingBedDraft[],
  baseline: BedRoomBaseline,
): HousekeepingBedDraft[] {
  return rooms.filter((room) => isBedRoomChangedToday(room, baseline));
}
