import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { NextRequest, NextResponse } from 'next/server';

export function isStaleRefreshError(code?: string, message?: string): boolean {
  if (code === 'refresh_token_not_found' || code === 'invalid_refresh_token') return true;
  return message?.toLowerCase().includes('refresh token') ?? false;
}

export async function clearStaleAuthSession(supabase: SupabaseClient): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
}

export type AuthResolveResult = {
  user: User | null;
  clearedStale: boolean;
};

/** 만료·무효 refresh token 시 세션을 비우고 null을 반환한다. */
export async function resolveAuthUser(supabase: SupabaseClient): Promise<AuthResolveResult> {
  const { data, error } = await supabase.auth.getUser();
  if (!error) {
    return { user: data.user ?? null, clearedStale: false };
  }

  const stale = isStaleRefreshError(error.code, error.message);
  if (stale) {
    await clearStaleAuthSession(supabase);
  }
  return { user: null, clearedStale: stale };
}

export async function getSafeUser(supabase: SupabaseClient): Promise<User | null> {
  const { user } = await resolveAuthUser(supabase);
  return user;
}

/** middleware 응답에서 Supabase auth 쿠키를 즉시 제거한다. */
export function stripSupabaseAuthCookies(request: NextRequest, response: NextResponse): void {
  for (const { name } of request.cookies.getAll()) {
    if (name.startsWith('sb-') && name.includes('auth-token')) {
      response.cookies.set(name, '', { maxAge: 0, path: '/' });
    }
  }
}
