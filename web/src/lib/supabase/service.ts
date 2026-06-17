import { createClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from '@/lib/supabase/env';

export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY가 없습니다. 택배 인도 서명 업로드에 필요합니다. web/.env.local에 추가하세요.',
    );
  }

  const { url } = getSupabasePublicEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hasServiceRoleKey(): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(key && !key.includes('your-service-role-key'));
}
