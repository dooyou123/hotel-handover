import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import type { GuestNoticeBranding, GuestNoticeBrandingInput } from '@/lib/guest-notices/types';

const BUCKET = 'hotel-branding';
const LOGO_FILENAME = 'guest-notice-logo';
const MAX_BYTES = 1024 * 1024;

function buildPublicUrl(storagePath: string): string {
  const { url } = getSupabasePublicEnv();
  const encodedPath = storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${url.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${encodedPath}`;
}

function mapBrandingRow(row: {
  guest_notice_logo_path: string;
  guest_notice_footer_ko: string;
  guest_notice_footer_en: string;
  guest_notice_footer_zh: string;
  guest_notice_footer_ja: string;
}): GuestNoticeBranding {
  const logo_path = row.guest_notice_logo_path ?? '';
  return {
    logo_path,
    logo_url: logo_path ? buildPublicUrl(logo_path) : null,
    footer_ko: row.guest_notice_footer_ko ?? '',
    footer_en: row.guest_notice_footer_en ?? '',
    footer_zh: row.guest_notice_footer_zh ?? '',
    footer_ja: row.guest_notice_footer_ja ?? '',
  };
}

export async function fetchGuestNoticeBranding(hotelId = DEFAULT_HOTEL_ID): Promise<GuestNoticeBranding> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('hotels')
    .select(
      'guest_notice_logo_path, guest_notice_footer_ko, guest_notice_footer_en, guest_notice_footer_zh, guest_notice_footer_ja',
    )
    .eq('id', hotelId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    return {
      logo_path: '',
      logo_url: null,
      footer_ko: '',
      footer_en: '',
      footer_zh: '',
      footer_ja: '',
    };
  }
  return mapBrandingRow(data);
}

export async function saveGuestNoticeBranding(
  input: GuestNoticeBrandingInput,
  hotelId = DEFAULT_HOTEL_ID,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('hotels')
    .update({
      guest_notice_footer_ko: input.footer_ko,
      guest_notice_footer_en: input.footer_en,
      guest_notice_footer_zh: input.footer_zh,
      guest_notice_footer_ja: input.footer_ja,
    })
    .eq('id', hotelId);
  if (error) throw error;
}

export async function uploadGuestNoticeLogo(file: File, hotelId = DEFAULT_HOTEL_ID): Promise<GuestNoticeBranding> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있습니다.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('로고는 1MB 이하만 업로드할 수 있습니다.');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const storagePath = `${hotelId}/${LOGO_FILENAME}.${ext}`;
  const supabase = createClient();

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { error } = await supabase
    .from('hotels')
    .update({ guest_notice_logo_path: storagePath })
    .eq('id', hotelId);
  if (error) throw error;

  return fetchGuestNoticeBranding(hotelId);
}

export async function removeGuestNoticeLogo(hotelId = DEFAULT_HOTEL_ID): Promise<GuestNoticeBranding> {
  const supabase = createClient();
  const current = await fetchGuestNoticeBranding(hotelId);
  if (current.logo_path) {
    await supabase.storage.from(BUCKET).remove([current.logo_path]);
  }
  const { error } = await supabase.from('hotels').update({ guest_notice_logo_path: '' }).eq('id', hotelId);
  if (error) throw error;
  return fetchGuestNoticeBranding(hotelId);
}
