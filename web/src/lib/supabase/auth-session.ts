import type { SupabaseClient, User } from '@supabase/supabase-js';

export function isStaleRefreshError(code?: string, message?: string): boolean {
  if (code === 'refresh_token_not_found' || code === 'invalid_refresh_token') return true;
  return message?.toLowerCase().includes('refresh token') ?? false;
}

export async function clearStaleAuthSession(supabase: SupabaseClient): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
}

/** 만료·무효 refresh token 시 세션을 비우고 null을 반환한다. */
export async function getSafeUser(supabase: SupabaseClient): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (isStaleRefreshError(error.code, error.message)) {
      await clearStaleAuthSession(supabase);
    }
    return null;
  }
  return data.user ?? null;
}
