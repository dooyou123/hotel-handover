import { NextResponse } from 'next/server';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import type { RateConfirmGuestBlacklistEntry } from '@/lib/rate-confirm/blacklist-types';
import { guestServiceClient, requireGuestSession } from '@/lib/rate-confirm/guest-api';

export async function GET() {
  const gate = await requireGuestSession();
  if (!gate.ok) return gate.response;

  const supabase = guestServiceClient();
  const { data, error } = await supabase
    .from('rate_confirm_guest_blacklist')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: (data ?? []) as RateConfirmGuestBlacklistEntry[] });
}
