import Link from 'next/link';
import { AppNav } from '@/components/layout/app-nav';
import { AppHeaderActions } from '@/components/layout/app-header-actions';
import { SessionBar } from '@/components/layout/session-bar';

type AppShellClassicProps = {
  email: string;
  children: React.ReactNode;
};

export function AppShellClassic({ email, children }: AppShellClassicProps) {
  return (
    <div className="app">
      <header className="app-topbar">
        <div className="app-topbar__start">
          <Link href="/handover" className="app-topbar__brand">
            프런트
          </Link>
          <AppNav variant="classic" />
        </div>
        <div className="app-topbar__end">
          <SessionBar email={email} />
          <AppHeaderActions />
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
