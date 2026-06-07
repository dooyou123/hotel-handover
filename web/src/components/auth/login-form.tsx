'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseNetworkError } from '@/lib/supabase/env';

type LoginFormProps = {
  redirectTo?: string;
};

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return '등록된 계정이 아니거나 비밀번호가 올바르지 않습니다.';
  }
  if (lower.includes('email not confirmed')) {
    return '이메일 인증이 필요합니다. 관리자에게 문의하세요.';
  }
  return message;
}

function networkErrorMessage(): string {
  return [
    'Supabase 서버에 연결하지 못했습니다.',
    '· .env.local의 URL·anon key가 Dashboard와 같은지 확인',
    '· npm run dev를 끄고 다시 실행 (env는 시작 시에만 반영)',
    '· Supabase 프로젝트가 일시중지(paused) 상태가 아닌지 확인',
    '· 광고/추적 차단 확장 프로그램 끄기',
  ].join('\n');
}

export function LoginForm({ redirectTo = '/handover' }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(mapAuthError(signInError.message));
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (caught) {
      if (caught instanceof Error && !isSupabaseNetworkError(caught)) {
        setError(caught.message);
        return;
      }

      setError(networkErrorMessage());
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">직원 이메일</span>
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="name@hotel.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-emerald-500/30 focus:ring-4"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">비밀번호</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="관리자가 안내한 비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-emerald-500/30 focus:ring-4"
        />
      </label>

      {error ? (
        <p className="whitespace-pre-line rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="btn btn--add"
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {loading ? '로그인 중…' : '로그인'}
      </button>

      <p className="text-center text-xs text-slate-500">
        Supabase에 등록된 직원만 로그인할 수 있습니다.
      </p>
    </form>
  );
}
