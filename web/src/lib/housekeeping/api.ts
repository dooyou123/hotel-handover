import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type {
  HousekeepingReport,
  HousekeepingReportBundle,
  HousekeepingRoomRow,
  SaveHousekeepingInput,
} from '@/lib/housekeeping/types';

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
  const reportPayload = {
    hotel_id: DEFAULT_HOTEL_ID,
    work_date: input.work_date,
    previous_day_notes: input.previous_day_notes.trim(),
    next_day_notes: input.next_day_notes.trim(),
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
