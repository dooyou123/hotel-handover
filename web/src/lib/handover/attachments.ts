import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import type { CardAttachment } from '@/lib/handover/types';

const BUCKET = 'card-attachments';
const MAX_ATTACHMENTS = 2;
const MAX_BYTES = 2 * 1024 * 1024;

/** Storage API 호출 없이 공개 URL 조합 (버킷 public 필요). */
export function buildAttachmentPublicUrl(storagePath: string, supabaseUrl: string): string {
  const encodedPath = storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const base = supabaseUrl.replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${BUCKET}/${encodedPath}`;
}

export function getAttachmentUrl(storagePath: string): string {
  const { url } = getSupabasePublicEnv();
  return buildAttachmentPublicUrl(storagePath, url);
}

export function enrichAttachments(rows: CardAttachment[]): CardAttachment[] {
  return rows.map((row) => ({
    ...row,
    url: row.storage_path ? getAttachmentUrl(row.storage_path) : undefined,
  }));
}

export async function uploadCardAttachment(
  cardId: string,
  file: File,
  existingCount: number,
): Promise<CardAttachment> {
  if (existingCount >= MAX_ATTACHMENTS) {
    throw new Error('사진은 카드당 최대 2장까지 등록할 수 있습니다.');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 등록할 수 있습니다.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('이미지는 2MB 이하만 등록할 수 있습니다.');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const storagePath = `${DEFAULT_HOTEL_ID}/${cardId}/${Date.now()}.${ext}`;
  const supabase = createClient();

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('card_attachments')
    .insert({
      card_id: cardId,
      filename: file.name,
      mime_type: file.type,
      storage_path: storagePath,
    })
    .select('*')
    .single();

  if (error) throw error;

  await supabase.from('cards').update({ updated_at: new Date().toISOString() }).eq('id', cardId);

  const attachment = data as CardAttachment;
  return { ...attachment, url: getAttachmentUrl(storagePath) };
}

export async function deleteCardAttachment(attachment: CardAttachment): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([attachment.storage_path]);
  const { error } = await supabase.from('card_attachments').delete().eq('id', attachment.id);
  if (error) throw error;
}
