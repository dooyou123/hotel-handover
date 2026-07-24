import { LoginForm } from '@/components/auth/login-form';

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <div className="login-page">
      <div className="login-page__inner">
        <div className="login-page__brand header__brand">
          <span className="header__icon" aria-hidden>
            🏨
          </span>
          <div>
            <h1>프런트 인수인계 보드</h1>
            <p className="header__sub">등록된 직원 계정으로 로그인</p>
          </div>
        </div>

        <div className="schedule-panel login-page__panel">
          {params.error ? (
            <p className="login-form__error" style={{ marginBottom: '1rem' }}>
              로그인에 실패했습니다. 다시 시도해 주세요.
            </p>
          ) : null}
          <LoginForm redirectTo={params.next ?? '/handover'} />
          <p className="login-page__guest-link">
            <a href="/rate-confirm/guest">객실료 컨펌 (게스트 PIN)</a>
          </p>
        </div>
      </div>
    </div>
  );
}
