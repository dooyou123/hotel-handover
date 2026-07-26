import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { resolveAuthUser, stripSupabaseAuthCookies } from '@/lib/supabase/auth-session';
import { getSupabasePublicEnv } from '@/lib/supabase/env';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, anonKey } = getSupabasePublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const { user, clearedStale } = await resolveAuthUser(supabase);
  if (clearedStale) {
    stripSupabaseAuthCookies(request, supabaseResponse);
  }

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/auth');
  const isPublic =
    isAuthRoute ||
    pathname.startsWith('/parcels/sign/') ||
    pathname === '/api/parcels/sign' ||
    pathname.startsWith('/api/parcels/sign') ||
    pathname === '/rate-confirm/guest' ||
    pathname.startsWith('/rate-confirm/guest/') ||
    pathname.startsWith('/api/rate-confirm/guest') ||
    pathname === '/day-off' ||
    pathname.startsWith('/api/day-off/');

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    if (clearedStale) {
      url.searchParams.set('reason', 'session_expired');
    }
    const redirect = NextResponse.redirect(url);
    if (clearedStale) {
      stripSupabaseAuthCookies(request, redirect);
    }
    return redirect;
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/handover';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
