import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { HousekeepingBedDraft, HkBedType } from '@/lib/housekeeping/types';
import type { RoomBedState } from '@/lib/housekeeping/room-state';

export type BedRoomBaseline = Record<string, HkBedType>;

export type BedTypeSource = {
  baseline: BedRoomBaseline;
  roomState?: RoomBedState;
};

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

export function normalizeBedTypeSource(source: BedRoomBaseline | BedTypeSource): BedTypeSource {
  if (
    typeof source === 'object' &&
    source !== null &&
    'baseline' in source &&
    typeof (source as BedTypeSource).baseline === 'object'
  ) {
    const ctx = source as BedTypeSource;
    return { baseline: ctx.baseline, roomState: ctx.roomState ?? {} };
  }
  return { baseline: source as BedRoomBaseline, roomState: {} };
}

/** 오늘 변경 → 영구 구성 → 과거 리포트 순으로 현재 침대 구성을 판단합니다. */
export function getEffectiveBedType(
  room: Pick<HousekeepingBedDraft, 'room_number' | 'room_type'>,
  source: BedRoomBaseline | BedTypeSource,
): HkBedType {
  const { baseline, roomState = {} } = normalizeBedTypeSource(source);
  return room.room_type || roomState[room.room_number] || baseline[room.room_number] || '';
}

export function getPersistedBedType(
  room: Pick<HousekeepingBedDraft, 'room_number' | 'room_type'>,
  source: BedRoomBaseline | BedTypeSource,
): HkBedType {
  const { baseline, roomState = {} } = normalizeBedTypeSource(source);
  return roomState[room.room_number] || baseline[room.room_number] || '';
}

export function isBedRoomChangedToday(
  room: HousekeepingBedDraft,
  source: BedRoomBaseline | BedTypeSource,
): boolean {
  const persisted = getPersistedBedType(room, source);
  return Boolean(room.extra_bed_action || (room.room_type && room.room_type !== persisted));
}

export function filterBedRoomsToSave(
  rooms: HousekeepingBedDraft[],
  source: BedRoomBaseline | BedTypeSource,
): HousekeepingBedDraft[] {
  return rooms.filter(
    (room) => isBedRoomChangedToday(room, source) || Boolean(room.guest_status),
  );
}
