import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import type { ReconcileResult } from '@/lib/rate-confirm/compare-engine';
import {
  guestServiceClient,
  requireGuestSession,
} from '@/lib/rate-confirm/guest-api';
import type { RateConfirmItem, RateConfirmSession } from '@/lib/rate-confirm/history-types';
import { buildItemInsertsFromErrors } from '@/lib/rate-confirm/session-payload';

export async function POST(request: NextRequest) {
  const gate = await requireGuestSession();
  if (!gate.ok) return gate.response;

  let body: {
    author?: string;
    workGroup?: string;
    tlFileName?: string;
    pmsFileName?: string;
    notes?: string;
    result?: ReconcileResult;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  if (!body.result) {
    return NextResponse.json({ error: '대조 결과가 필요합니다.' }, { status: 400 });
  }

  const author = (body.author?.trim() || '게스트').slice(0, 40);
  const workGroup = (body.workGroup?.trim() || '게스트').slice(0, 20);
  const supabase = guestServiceClient();

  const { data: session, error: sessionError } = await supabase
    .from('rate_confirm_sessions')
    .insert({
      hotel_id: DEFAULT_HOTEL_ID,
      author,
      work_group: workGroup,
      tl_file_name: body.tlFileName?.trim() ?? '',
      pms_file_name: body.pmsFileName?.trim() ?? '',
      notes: body.notes?.trim() ?? '',
      summary: { ...body.result.summary, matchCount: body.result.matches.length },
    })
    .select('*')
    .single();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  const itemRows = buildItemInsertsFromErrors(body.result.errors).map((row) => ({
    ...row,
    session_id: session.id,
    hotel_id: DEFAULT_HOTEL_ID,
  }));

  if (itemRows.length) {
    const { error: itemsError } = await supabase.from('rate_confirm_items').insert(itemRows);
    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }
  }

  const { data: items, error: itemsFetchError } = await supabase
    .from('rate_confirm_items')
    .select('*')
    .eq('session_id', session.id)
    .order('ota');

  if (itemsFetchError) {
    return NextResponse.json({ error: itemsFetchError.message }, { status: 500 });
  }

  return NextResponse.json({
    ...(session as RateConfirmSession),
    items: (items ?? []) as RateConfirmItem[],
  });
}
