import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { CardAttachment } from '@/lib/handover/types';

const BUCKET = 'card-attachments';
const MAX_ATTACHMENTS = 2;
const MAX_BYTES = 2 * 1024 * 1024;

export async function getAttachmentUrl(storagePath: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function enrichAttachments(rows: CardAttachment[]): Promise<CardAttachment[]> {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      url: (await getAttachmentUrl(row.storage_path)) ?? undefined,
    })),
  );
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
  return { ...attachment, url: (await getAttachmentUrl(storagePath)) ?? undefined };
}

export async function deleteCardAttachment(attachment: CardAttachment): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([attachment.storage_path]);
  const { error } = await supabase.from('card_attachments').delete().eq('id', attachment.id);
  if (error) throw error;
}
