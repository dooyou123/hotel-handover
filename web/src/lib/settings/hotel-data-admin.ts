import type { QueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

export async function resetHotelData(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('reset_hotel_data', { p_hotel_id: DEFAULT_HOTEL_ID });
  if (error) throw error;
}

export async function seedHotelSampleData(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('seed_hotel_sample_data', { p_hotel_id: DEFAULT_HOTEL_ID });
  if (error) throw error;
}

/** 데이터 초기화·시드 후 전 화면 캐시 갱신 */
export function invalidateAllHotelQueries(queryClient: QueryClient): void {
  void queryClient.invalidateQueries();
}
