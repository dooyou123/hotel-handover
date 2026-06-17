import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import {
  PARCEL_SIGN_TOKEN_TTL_MS,
  buildParcelSignUrl,
  generateDeliveryToken,
  hashDeliveryToken,
} from '@/lib/parcels/tokens';
import { createClient } from '@/lib/supabase/server';
import { hasServiceRoleKey } from '@/lib/supabase/service';

type RouteContext = { params: Promise<{ parcelId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { parcelId } = await context.params;
  if (!parcelId) {
    return NextResponse.json({ error: '항목 ID가 필요합니다.' }, { status: 400 });
  }

  let staffName = '';
  try {
    const body = (await request.json()) as { staff_name?: string };
    staffName = body.staff_name?.trim() ?? '';
  } catch {
    /* optional body */
  }

  const { data: parcel, error: parcelError } = await supabase
    .from('parcels')
    .select('id, status, hotel_id')
    .eq('id', parcelId)
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .maybeSingle();

  if (parcelError) {
    return NextResponse.json({ error: parcelError.message }, { status: 500 });
  }
  if (!parcel) {
    return NextResponse.json({ error: '항목을 찾을 수 없습니다.' }, { status: 404 });
  }

  const status = String(parcel.status);
  if (status === 'delivered' || status === 'returned') {
    return NextResponse.json({ error: '이미 처리된 항목입니다.' }, { status: 409 });
  }

  const token = generateDeliveryToken();
  const tokenHash = hashDeliveryToken(token);
  const expiresAt = new Date(Date.now() + PARCEL_SIGN_TOKEN_TTL_MS).toISOString();

  const { error: insertError } = await supabase.from('parcel_delivery_tokens').insert({
    parcel_id: parcelId,
    hotel_id: DEFAULT_HOTEL_ID,
    token_hash: tokenHash,
    expires_at: expiresAt,
    created_by: staffName,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const origin = request.nextUrl.origin;
  const signUrl = buildParcelSignUrl(origin, token);

  return NextResponse.json({
    token,
    signUrl,
    expiresAt,
    expiresInMinutes: Math.round(PARCEL_SIGN_TOKEN_TTL_MS / 60_000),
  });
}
