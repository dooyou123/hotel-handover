import { buildDefaultBedRoomNumbers } from '@/lib/housekeeping/rooms';

export const HK_BED_TYPES = [
  { value: '', label: '—' },
  { value: 'twin', label: '트윈' },
  { value: 'triple', label: '트리플' },
] as const;

export const HK_EXTRA_BED_ACTIONS = [
  { value: '', label: '—' },
  { value: 'add', label: '엑스트라베드 넣음' },
  { value: 'remove', label: '엑스트라베드 뺌' },
  { value: 'keep', label: '변경 없음' },
] as const;

export type HkBedType = (typeof HK_BED_TYPES)[number]['value'];
export type HkExtraBedAction = (typeof HK_EXTRA_BED_ACTIONS)[number]['value'];
export type HkRowKind = 'bed' | 'special';

export type HousekeepingReport = {
  id: string;
  hotel_id: string;
  work_date: string;
  previous_day_notes: string;
  next_day_notes: string;
  author: string;
  staff_name: string;
  shift: string;
  created_at: string;
  updated_at: string;
};

export type HousekeepingRoomRow = {
  id: string;
  report_id: string;
  room_number: string;
  row_kind: HkRowKind;
  room_type: HkBedType;
  extra_bed_action: HkExtraBedAction;
  early_checkin: string;
  is_vip: boolean;
  is_long_stay: boolean;
  notes: string;
  sort_order: number;
};

export type HousekeepingBedDraft = {
  id?: string;
  room_number: string;
  room_type: HkBedType;
  extra_bed_action: HkExtraBedAction;
  sort_order: number;
};

export type HousekeepingSpecialDraft = {
  id?: string;
  room_number: string;
  early_checkin: string;
  is_vip: boolean;
  is_long_stay: boolean;
  notes: string;
  sort_order: number;
};

export type HousekeepingReportBundle = {
  report: HousekeepingReport | null;
  bedRooms: HousekeepingRoomRow[];
  specialRooms: HousekeepingRoomRow[];
};

export type SaveHousekeepingInput = {
  work_date: string;
  previous_day_notes: string;
  next_day_notes: string;
  author: string;
  staff_name: string;
  shift: string;
  bedRooms: HousekeepingBedDraft[];
  specialRooms: HousekeepingSpecialDraft[];
};

export function hkBedTypeLabel(value: string): string {
  return HK_BED_TYPES.find((item) => item.value === value)?.label ?? (value || '—');
}

export function hkExtraBedActionLabel(value: string): string {
  return HK_EXTRA_BED_ACTIONS.find((item) => item.value === value)?.label ?? (value || '—');
}

export function emptySpecialRoom(sortOrder: number): HousekeepingSpecialDraft {
  return {
    room_number: '',
    early_checkin: '',
    is_vip: false,
    is_long_stay: false,
    notes: '',
    sort_order: sortOrder,
  };
}

export function buildDefaultBedRooms(saved: HousekeepingRoomRow[] = []): HousekeepingBedDraft[] {
  const byRoom = new Map(saved.map((room) => [room.room_number, room]));
  return buildDefaultBedRoomNumbers().map((roomNumber, index) => {
    const existing = byRoom.get(roomNumber);
    return {
      id: existing?.id,
      room_number: roomNumber,
      room_type: existing?.room_type ?? '',
      extra_bed_action: existing?.extra_bed_action ?? '',
      sort_order: index,
    };
  });
}

export function mergeBedRoomsFromSaved(saved: HousekeepingRoomRow[]): HousekeepingBedDraft[] {
  const bedRows = saved.filter((room) => room.row_kind === 'bed');
  return buildDefaultBedRooms(bedRows);
}

export function mapSpecialRoomsFromSaved(saved: HousekeepingRoomRow[]): HousekeepingSpecialDraft[] {
  const specialRows = saved.filter((room) => room.row_kind === 'special');
  if (!specialRows.length) return [emptySpecialRoom(0)];
  return specialRows.map((room, index) => ({
    id: room.id,
    room_number: room.room_number,
    early_checkin: room.early_checkin,
    is_vip: room.is_vip,
    is_long_stay: room.is_long_stay,
    notes: room.notes,
    sort_order: room.sort_order ?? index,
  }));
}
