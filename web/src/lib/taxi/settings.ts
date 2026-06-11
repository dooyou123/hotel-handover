import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

export async function fetchTaxiWhatsAppRecipient(hotelId = DEFAULT_HOTEL_ID): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('hotels')
    .select('taxi_whatsapp_recipient')
    .eq('id', hotelId)
    .maybeSingle();
  if (error) throw error;
  return data?.taxi_whatsapp_recipient ?? '';
}

export async function saveTaxiWhatsAppRecipient(
  recipient: string,
  hotelId = DEFAULT_HOTEL_ID,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('hotels')
    .update({ taxi_whatsapp_recipient: recipient.trim() })
    .eq('id', hotelId);
  if (error) throw error;
}
