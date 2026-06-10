import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

export type HotelSettings = {
  auto_archive_done_days: number;
};

export async function fetchHotelSettings(hotelId = DEFAULT_HOTEL_ID): Promise<HotelSettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('hotels')
    .select('auto_archive_done_days')
    .eq('id', hotelId)
    .maybeSingle();
  if (error) throw error;
  return { auto_archive_done_days: data?.auto_archive_done_days ?? 0 };
}

export async function saveHotelAutoArchiveDays(days: number, hotelId = DEFAULT_HOTEL_ID): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('hotels')
    .update({ auto_archive_done_days: Math.max(0, Math.min(365, days)) })
    .eq('id', hotelId);
  if (error) throw error;
}

export async function runAutoArchiveDoneCards(hotelId = DEFAULT_HOTEL_ID): Promise<number> {
  const settings = await fetchHotelSettings(hotelId);
  if (!settings.auto_archive_done_days) return 0;

  const supabase = createClient();
  const { data, error } = await supabase.rpc('auto_archive_done_cards', {
    p_hotel_id: hotelId,
    p_days: settings.auto_archive_done_days,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}
