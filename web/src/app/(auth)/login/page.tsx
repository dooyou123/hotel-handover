import { LoginForm } from '@/components/auth/login-form';

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <div className="app" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '28rem' }}>
        <div className="header__brand" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
          <span className="header__icon" aria-hidden>
            🏨
          </span>
          <div>
            <h1>프런트 인수인계 보드</h1>
            <p className="header__sub">등록된 직원 계정으로 로그인</p>
          </div>
        </div>

        <div className="schedule-panel">
          {params.error ? (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              로그인에 실패했습니다. 다시 시도해 주세요.
            </p>
          ) : null}
          <LoginForm redirectTo={params.next ?? '/handover'} />
        </div>
      </div>
    </div>
  );
}
