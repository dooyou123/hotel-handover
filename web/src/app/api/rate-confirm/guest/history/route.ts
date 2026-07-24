import { NextResponse } from 'next/server';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import {
  guestServiceClient,
  requireGuestSession,
} from '@/lib/rate-confirm/guest-api';
import type { RateConfirmSession } from '@/lib/rate-confirm/history-types';

export async function GET() {
  const gate = await requireGuestSession();
  if (!gate.ok) return gate.response;

  const supabase = guestServiceClient();
  const { data, error } = await supabase
    .from('rate_confirm_sessions')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: (data ?? []) as RateConfirmSession[] });
}
