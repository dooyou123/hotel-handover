import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import { compressImageFile } from '@/lib/handover/image-compress';
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

  // 큰 원본은 브라우저에서 줄여서 올린다 — 직원은 원본을 그대로 선택하면 된다
  const prepared = await compressImageFile(file, { maxBytes: MAX_BYTES });
  if (prepared.size > MAX_BYTES) {
    throw new Error('이미지는 2MB 이하만 등록할 수 있습니다.');
  }

  const ext = prepared.name.split('.').pop()?.toLowerCase() || 'jpg';
  const storagePath = `${DEFAULT_HOTEL_ID}/${cardId}/${Date.now()}.${ext}`;
  const supabase = createClient();

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, prepared, {
    contentType: prepared.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('card_attachments')
    .insert({
      card_id: cardId,
      filename: prepared.name,
      mime_type: prepared.type,
      storage_path: storagePath,
    })
    .select('*')
    .single();

  if (error) throw error;

  await supabase.from('cards').update({ updated_at: new Date().toISOString() }).eq('id', cardId);

  const attachment = data as CardAttachment;
  return { ...attachment, url: getAttachmentUrl(storagePath) };
}

/**
 * 사진 주석 저장 — 첨부 행(id·순서)은 그대로 두고 스토리지 파일만 주석본으로 교체한다.
 * 새 파일을 먼저 올리고 DB를 바꾼 뒤 옛 파일을 지우므로, 중간에 실패해도 사진이 사라지지 않는다.
 */
export async function replaceCardAttachment(attachment: CardAttachment, file: File): Promise<void> {
  const prepared = await compressImageFile(file, { maxBytes: MAX_BYTES });
  if (prepared.size > MAX_BYTES) {
    throw new Error('이미지는 2MB 이하만 등록할 수 있습니다.');
  }

  const ext = prepared.name.split('.').pop()?.toLowerCase() || 'jpg';
  const storagePath = `${DEFAULT_HOTEL_ID}/${attachment.card_id}/${Date.now()}.${ext}`;
  const supabase = createClient();

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, prepared, {
    contentType: prepared.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { error } = await supabase
    .from('card_attachments')
    .update({ filename: prepared.name, mime_type: prepared.type, storage_path: storagePath })
    .eq('id', attachment.id);
  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }

  if (attachment.storage_path) {
    await supabase.storage.from(BUCKET).remove([attachment.storage_path]);
  }
  await supabase.from('cards').update({ updated_at: new Date().toISOString() }).eq('id', attachment.card_id);
}

export async function deleteCardAttachment(attachment: CardAttachment): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([attachment.storage_path]);
  const { error } = await supabase.from('card_attachments').delete().eq('id', attachment.id);
  if (error) throw error;
}
