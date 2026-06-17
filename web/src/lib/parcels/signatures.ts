import { createClient } from '@/lib/supabase/client';

const BUCKET = 'parcel-signatures';

export async function getParcelSignatureUrl(storagePath: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
  if (error) return null;
  return data.signedUrl;
}
