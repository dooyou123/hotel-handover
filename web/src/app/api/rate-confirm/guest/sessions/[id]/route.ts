import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import {
  guestServiceClient,
  requireGuestSession,
} from '@/lib/rate-confirm/guest-api';
import type { RateConfirmItem, RateConfirmSession } from '@/lib/rate-confirm/history-types';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const gate = await requireGuestSession();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: '세션 ID가 필요합니다.' }, { status: 400 });
  }

  const supabase = guestServiceClient();
  const [sessionRes, itemsRes] = await Promise.all([
    supabase
      .from('rate_confirm_sessions')
      .select('*')
      .eq('id', id)
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .maybeSingle(),
    supabase
      .from('rate_confirm_items')
      .select('*')
      .eq('session_id', id)
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .order('ota'),
  ]);

  if (sessionRes.error) {
    return NextResponse.json({ error: sessionRes.error.message }, { status: 500 });
  }
  if (!sessionRes.data) {
    return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 });
  }
  if (itemsRes.error) {
    return NextResponse.json({ error: itemsRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ...(sessionRes.data as RateConfirmSession),
    items: (itemsRes.data ?? []) as RateConfirmItem[],
  });
}
