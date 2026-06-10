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

export const HK_STATUS_NOTE_FIELDS = [
  { key: 'hk_house_use', label: 'H/U', hint: 'House Use — 객실번호·내용' },
  { key: 'hk_comp', label: 'Comp', hint: '컴프(무료) 객실' },
  { key: 'hk_vip_prep', label: 'VIP / 선정비', hint: 'VIP·선정비 객실' },
  { key: 'hk_out_of_order', label: 'O.O', hint: 'Out of Order — 사용 불가 객실' },
  { key: 'hk_long_stay', label: '장기 숙박', hint: '장기 투숙 객실' },
  { key: 'hk_maintenance_attention', label: '정비 유의 객실', hint: '청소·정비 시 특별 유의 객실' },
  {
    key: 'hk_post_shift_delivery',
    label: 'H/K 퇴근 후 객실 DELIVERY',
    hint: 'H/K 퇴근 후 배달·전달 객실',
    fullWidth: true,
  },
  {
    key: 'hk_maintenance_notes',
    label: '객실 정비 유의점 / 기타',
    hint: '정비 유의사항·기타 전달 사항',
    fullWidth: true,
  },
] as const;

export type HkStatusNoteKey = (typeof HK_STATUS_NOTE_FIELDS)[number]['key'];

export type HkStatusNotes = Record<HkStatusNoteKey, string>;

export const EMPTY_HK_STATUS_NOTES: HkStatusNotes = {
  hk_house_use: '',
  hk_comp: '',
  hk_vip_prep: '',
  hk_out_of_order: '',
  hk_long_stay: '',
  hk_maintenance_attention: '',
  hk_post_shift_delivery: '',
  hk_maintenance_notes: '',
};

export function mapStatusNotesFromReport(
  report: Pick<HousekeepingReport, HkStatusNoteKey> | null | undefined,
): HkStatusNotes {
  if (!report) return { ...EMPTY_HK_STATUS_NOTES };
  return {
    hk_house_use: report.hk_house_use ?? '',
    hk_comp: report.hk_comp ?? '',
    hk_vip_prep: report.hk_vip_prep ?? '',
    hk_out_of_order: report.hk_out_of_order ?? '',
    hk_long_stay: report.hk_long_stay ?? '',
    hk_maintenance_attention: report.hk_maintenance_attention ?? '',
    hk_post_shift_delivery: report.hk_post_shift_delivery ?? '',
    hk_maintenance_notes: report.hk_maintenance_notes ?? '',
  };
}

export function hasAnyStatusNotes(notes: HkStatusNotes): boolean {
  return HK_STATUS_NOTE_FIELDS.some((field) => notes[field.key].trim());
}

export type HousekeepingReport = {
  id: string;
  hotel_id: string;
  work_date: string;
  previous_day_notes: string;
  next_day_notes: string;
  hk_house_use: string;
  hk_comp: string;
  hk_vip_prep: string;
  hk_out_of_order: string;
  hk_long_stay: string;
  hk_maintenance_attention: string;
  hk_post_shift_delivery: string;
  hk_maintenance_notes: string;
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
  bed_type_changed_at: string | null;
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
  bed_type_changed_at?: string | null;
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
  statusNotes: HkStatusNotes;
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

/** 침대 종류 최종 변경 요청 시각 (HK 보기·인쇄용) */
export function formatBedTypeChangedAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
      bed_type_changed_at: existing?.bed_type_changed_at ?? undefined,
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
