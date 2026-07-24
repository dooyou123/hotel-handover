import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import {
  guestServiceClient,
  requireGuestSession,
} from '@/lib/rate-confirm/guest-api';
import type {
  RateConfirmItem,
  RateConfirmResolutionAction,
  RateConfirmResolutionStatus,
} from '@/lib/rate-confirm/history-types';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const gate = await requireGuestSession();
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: '항목 ID가 필요합니다.' }, { status: 400 });
  }

  let body: {
    resolution_status?: RateConfirmResolutionStatus;
    resolution_action?: RateConfirmResolutionAction | '';
    resolution_note?: string;
    author?: string;
    workGroup?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  if (body.resolution_status !== 'resolved' && body.resolution_status !== 'skipped') {
    return NextResponse.json({ error: '처리 상태가 올바르지 않습니다.' }, { status: 400 });
  }

  const supabase = guestServiceClient();
  const { data, error } = await supabase
    .from('rate_confirm_items')
    .update({
      resolution_status: body.resolution_status,
      resolution_action: body.resolution_action ?? '',
      resolution_note: (body.resolution_note ?? '').trim(),
      resolved_by: (body.author?.trim() || '게스트').slice(0, 40),
      work_group: (body.workGroup?.trim() || '게스트').slice(0, 20),
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .select('*')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ item: data as RateConfirmItem });
}
