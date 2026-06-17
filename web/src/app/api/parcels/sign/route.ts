import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { markSignTokenUsed, validateSignToken } from '@/lib/parcels/token-store';
import { createServiceClient, hasServiceRoleKey } from '@/lib/supabase/service';

const BUCKET = 'parcel-signatures';
const MAX_SIGNATURE_BYTES = 512 * 1024;

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[2], 'base64');
    return { mime: match[1].toLowerCase(), buffer };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' },
      { status: 503 },
    );
  }

  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json({ error: '토큰이 필요합니다.' }, { status: 400 });
  }

  try {
    const validated = await validateSignToken(token);
    if (!validated) {
      return NextResponse.json({ error: '만료되었거나 이미 사용된 링크입니다.' }, { status: 410 });
    }

    return NextResponse.json({
      preview: validated.preview,
      staffName: validated.staffName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '조회에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.' },
      { status: 503 },
    );
  }

  let body: { token?: string; recipient_name?: string; signature_data_url?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const token = body.token?.trim();
  const recipientName = body.recipient_name?.trim() ?? '';
  const signatureDataUrl = body.signature_data_url?.trim() ?? '';

  if (!token) {
    return NextResponse.json({ error: '토큰이 필요합니다.' }, { status: 400 });
  }
  if (!recipientName) {
    return NextResponse.json({ error: '수령자 성명을 입력해 주세요.' }, { status: 400 });
  }
  if (!signatureDataUrl) {
    return NextResponse.json({ error: '서명이 필요합니다.' }, { status: 400 });
  }

  const parsed = parseDataUrl(signatureDataUrl);
  if (!parsed || parsed.buffer.length < 32) {
    return NextResponse.json({ error: '서명 이미지 형식이 올바르지 않습니다.' }, { status: 400 });
  }
  if (parsed.buffer.length > MAX_SIGNATURE_BYTES) {
    return NextResponse.json({ error: '서명 이미지가 너무 큽니다.' }, { status: 400 });
  }

  try {
    const validated = await validateSignToken(token);
    if (!validated) {
      return NextResponse.json({ error: '만료되었거나 이미 사용된 링크입니다.' }, { status: 410 });
    }

    const ext = parsed.mime === 'image/jpeg' ? 'jpg' : parsed.mime === 'image/webp' ? 'webp' : 'png';
    const storagePath = `${DEFAULT_HOTEL_ID}/${validated.parcel.id}/${Date.now()}.${ext}`;
    const supabase = createServiceClient();

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, parsed.buffer, {
      contentType: parsed.mime,
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const now = new Date().toISOString();
    const { error: parcelError } = await supabase
      .from('parcels')
      .update({
        status: 'delivered',
        delivered_at: now,
        recipient_name: recipientName,
        signature_path: storagePath,
        confirmed_by_staff: validated.staffName,
        updated_by: validated.staffName,
      })
      .eq('id', validated.parcel.id)
      .eq('hotel_id', DEFAULT_HOTEL_ID);

    if (parcelError) throw parcelError;

    await markSignTokenUsed(validated.tokenId);

    return NextResponse.json({ ok: true, delivered_at: now });
  } catch (error) {
    const message = error instanceof Error ? error.message : '인도 처리에 실패했습니다.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
