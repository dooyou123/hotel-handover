const PLACEHOLDER_MARKERS = ['YOUR_PROJECT', 'your-anon-key', 'your-service-role-key'];

export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    const hint =
      process.env.VERCEL === '1'
        ? 'Vercel Dashboard → Project → Settings → Environment Variables에 NEXT_PUBLIC_SUPABASE_URL·NEXT_PUBLIC_SUPABASE_ANON_KEY를 등록한 뒤 재배포하세요. (로컬: cd web && npm run vercel:setup)'
        : 'web/.env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 넣고 dev 서버를 재시작하세요.';
    throw new Error(`Supabase 환경 변수가 없습니다. ${hint}`);
  }

  const hasPlaceholder = PLACEHOLDER_MARKERS.some(
    (marker) => url.includes(marker) || anonKey.includes(marker),
  );
  if (hasPlaceholder) {
    throw new Error(
      'Supabase 환경 변수가 예시 값 그대로입니다. Dashboard → Project Settings → API에서 URL과 anon key를 복사해 .env.local에 넣으세요.',
    );
  }

  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL 형식이 올바르지 않습니다. https://xxxx.supabase.co 형태여야 합니다.');
  }

  return { url, anonKey };
}

function networkErrorPattern(): RegExp {
  return /failed to fetch|networkerror|load failed|fetch resource/i;
}

export function isSupabaseNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return networkErrorPattern().test(error.message);
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return networkErrorPattern().test(String((error as { message: unknown }).message));
  }
  return false;
}

export function supabaseNetworkErrorMessage(): string {
  return [
    'Supabase 서버에 연결하지 못했습니다.',
    '· http://localhost:3000 으로 접속 (IP 주소 대신)',
    '· .env.local URL·anon key 확인 후 dev 서버 재시작',
    '· Firefox: 향상된 추적 방지 끄기 또는 supabase.co 허용',
    '· 광고·추적 차단 확장 프로그램·VPN 끄기',
    '· Supabase Dashboard에서 프로젝트 일시중지(paused) 여부 확인',
  ].join('\n');
}

export function formatSupabaseClientError(error: unknown): string {
  if (isSupabaseNetworkError(error)) return supabaseNetworkErrorMessage();
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return '요청에 실패했습니다.';
}
