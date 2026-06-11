'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseNetworkError, supabaseNetworkErrorMessage } from '@/lib/supabase/env';

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

      setError(supabaseNetworkErrorMessage());
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <label className="field">
        <span>직원 이메일</span>
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="name@hotel.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label className="field">
        <span>비밀번호</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="관리자가 안내한 비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      {error ? <p className="login-form__error">{error}</p> : null}

      <button type="submit" disabled={loading} className="btn btn--primary login-form__submit">
        {loading ? '로그인 중…' : '로그인'}
      </button>

      <p className="login-form__hint">Supabase에 등록된 직원만 로그인할 수 있습니다.</p>
    </form>
  );
}
