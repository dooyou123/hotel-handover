import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type {
  HousekeepingBedDraft,
  HousekeepingReport,
  HousekeepingReportBundle,
  HousekeepingRoomRow,
  SaveHousekeepingInput,
} from '@/lib/housekeeping/types';

type ExistingBedRoom = Pick<
  HousekeepingRoomRow,
  'room_number' | 'room_type' | 'extra_bed_action' | 'bed_type_changed_at'
>;

function resolveBedTypeChangedAt(
  room: HousekeepingBedDraft,
  existing: ExistingBedRoom | undefined,
): string | null {
  const roomType = room.room_type || '';
  const ebAction = room.extra_bed_action || '';
  if (!roomType && !ebAction) return null;

  if (existing) {
    const unchanged =
      existing.room_type === roomType &&
      existing.extra_bed_action === ebAction &&
      existing.bed_type_changed_at;
    if (unchanged) return existing.bed_type_changed_at;
  }

  return room.bed_type_changed_at || new Date().toISOString();
}

function splitRooms(rooms: HousekeepingRoomRow[]): Pick<HousekeepingReportBundle, 'bedRooms' | 'specialRooms'> {
  return {
    bedRooms: rooms.filter((room) => room.row_kind === 'bed'),
    specialRooms: rooms.filter((room) => room.row_kind === 'special'),
  };
}

export async function fetchHousekeepingReport(workDate: string): Promise<HousekeepingReportBundle> {
  const supabase = createClient();
  const { data: report, error: reportError } = await supabase
    .from('housekeeping_reports')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('work_date', workDate)
    .maybeSingle();

  if (reportError) throw reportError;
  if (!report) return { report: null, bedRooms: [], specialRooms: [] };

  const { data: rooms, error: roomsError } = await supabase
    .from('housekeeping_report_rooms')
    .select('*')
    .eq('report_id', report.id)
    .order('sort_order')
    .order('room_number');

  if (roomsError) throw roomsError;

  const split = splitRooms((rooms ?? []) as HousekeepingRoomRow[]);
  return {
    report: report as HousekeepingReport,
    ...split,
  };
}

export async function saveHousekeepingReport(input: SaveHousekeepingInput): Promise<HousekeepingReportBundle> {
  const supabase = createClient();
  const notes = input.statusNotes;
  const reportPayload = {
    hotel_id: DEFAULT_HOTEL_ID,
    work_date: input.work_date,
    previous_day_notes: input.previous_day_notes.trim(),
    next_day_notes: input.next_day_notes.trim(),
    hk_house_use: notes.hk_house_use.trim(),
    hk_comp: notes.hk_comp.trim(),
    hk_vip_prep: notes.hk_vip_prep.trim(),
    hk_out_of_order: notes.hk_out_of_order.trim(),
    hk_long_stay: notes.hk_long_stay.trim(),
    hk_maintenance_attention: notes.hk_maintenance_attention.trim(),
    hk_post_shift_delivery: notes.hk_post_shift_delivery.trim(),
    hk_maintenance_notes: notes.hk_maintenance_notes.trim(),
    author: input.author.trim(),
    staff_name: input.staff_name.trim(),
    shift: input.shift.trim(),
  };

  const { data: existing } = await supabase
    .from('housekeeping_reports')
    .select('id')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('work_date', input.work_date)
    .maybeSingle();

  let reportId = existing?.id as string | undefined;

  if (reportId) {
    const { error } = await supabase.from('housekeeping_reports').update(reportPayload).eq('id', reportId);
    if (error) throw error;
  } else {
    const { data: created, error } = await supabase
      .from('housekeeping_reports')
      .insert(reportPayload)
      .select('id')
      .single();
    if (error) throw error;
    reportId = created.id;
  }

  let existingBedByRoom = new Map<string, ExistingBedRoom>();
  if (reportId) {
    const { data: existingBedRooms, error: existingError } = await supabase
      .from('housekeeping_report_rooms')
      .select('room_number, room_type, extra_bed_action, bed_type_changed_at')
      .eq('report_id', reportId)
      .eq('row_kind', 'bed');
    if (existingError) throw existingError;
    existingBedByRoom = new Map(
      (existingBedRooms ?? []).map((room) => [room.room_number as string, room as ExistingBedRoom]),
    );
  }

  const { error: deleteError } = await supabase
    .from('housekeeping_report_rooms')
    .delete()
    .eq('report_id', reportId);
  if (deleteError) throw deleteError;

  const bedRows = input.bedRooms
    .map((room, index) => ({
      report_id: reportId!,
      room_number: room.room_number.trim(),
      row_kind: 'bed' as const,
      room_type: room.room_type || '',
      extra_bed_action: room.extra_bed_action || '',
      bed_type_changed_at: resolveBedTypeChangedAt(room, existingBedByRoom.get(room.room_number.trim())),
      early_checkin: '',
      is_vip: false,
      is_long_stay: false,
      notes: '',
      sort_order: room.sort_order ?? index,
    }))
    .filter((room) => room.room_type || room.extra_bed_action);

  const specialRows = input.specialRooms
    .map((room, index) => ({
      report_id: reportId!,
      room_number: room.room_number.trim(),
      row_kind: 'special' as const,
      room_type: '' as const,
      extra_bed_action: '' as const,
      early_checkin: room.early_checkin.trim(),
      is_vip: room.is_vip,
      is_long_stay: room.is_long_stay,
      notes: room.notes.trim(),
      sort_order: room.sort_order ?? index,
    }))
    .filter(
      (room) =>
        room.room_number ||
        room.early_checkin ||
        room.is_vip ||
        room.is_long_stay ||
        room.notes,
    );

  const allRows = [...bedRows, ...specialRows];
  if (allRows.length > 0) {
    const { error: insertError } = await supabase.from('housekeeping_report_rooms').insert(allRows);
    if (insertError) throw insertError;
  }

  return fetchHousekeepingReport(input.work_date);
}
