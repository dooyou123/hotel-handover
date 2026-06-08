import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppNav } from '@/components/layout/app-nav';
import { SessionBar } from '@/components/layout/session-bar';
import { HeaderActionsProvider, HeaderActionsSlot } from '@/components/layout/header-actions';
import { SessionBarActionsProvider } from '@/components/layout/session-bar-actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <SessionBarActionsProvider>
      <HeaderActionsProvider>
        <div className="app">
          <header className="header">
            <div className="header__brand">
              <span className="header__icon" aria-hidden>
                🏨
              </span>
              <div>
                <h1>프런트 인수인계 보드</h1>
                <p className="header__sub">드래그로 상태 변경 · 한눈에 중요 업무 확인</p>
              </div>
            </div>
            <div className="header__actions">
              <HeaderActionsSlot />
              <Link href="/help" className="btn btn--ghost">
                도움말
              </Link>
            </div>
          </header>
          <AppNav />
          <SessionBar email={user.email ?? ''} />
          <main>{children}</main>
        </div>
      </HeaderActionsProvider>
    </SessionBarActionsProvider>
  );
}
