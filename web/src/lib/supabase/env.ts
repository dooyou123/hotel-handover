const PLACEHOLDER_MARKERS = ['YOUR_PROJECT', 'your-anon-key', 'your-service-role-key'];

export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(
      'Supabase 환경 변수가 없습니다. web/.env.local에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 넣고 dev 서버를 재시작하세요.',
    );
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

export function isSupabaseNetworkError(error: unknown): boolean {
  return error instanceof TypeError && /failed to fetch|networkerror|load failed/i.test(error.message);
}
