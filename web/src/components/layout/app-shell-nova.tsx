import Link from 'next/link';
import { AppNav } from '@/components/layout/app-nav';
import { AppHeaderActions } from '@/components/layout/app-header-actions';
import { TodayStaffBar } from '@/components/schedule/today-staff-bar';
import { TodayTaxiBar } from '@/components/transport/today-taxi-bar';
import { NavRouteGuard } from '@/components/layout/nav-route-guard';
import { OpsBootstrap } from '@/components/layout/ops-bootstrap';
import { SessionBar } from '@/components/layout/session-bar';

type AppShellNovaProps = {
  email: string;
  children: React.ReactNode;
};

export function AppShellNova({ email, children }: AppShellNovaProps) {
  return (
    <div className="nova-shell">
      <aside className="nova-sidebar" aria-label="주 메뉴">
        <div className="nova-sidebar__head">
          <Link href="/handover" className="nova-sidebar__brand">
            <span className="nova-sidebar__mark" aria-hidden />
            <span>
              <strong>프런트</strong>
              <small>호텔 인수인계</small>
            </span>
          </Link>
        </div>
        <AppNav variant="nova" />
        <div className="nova-sidebar__foot">
          <Link href="/help" className="nova-sidebar__foot-link">
            도움말
          </Link>
        </div>
      </aside>

      <div className="nova-main">
        <NavRouteGuard />
        <div className="nova-topbar-stack">
          <header className="nova-topbar">
            <TodayStaffBar variant="compact" />
            <div className="nova-topbar__end">
              <SessionBar email={email} />
              <AppHeaderActions />
            </div>
          </header>
          <TodayTaxiBar />
        </div>
        <main className="nova-content">
          <OpsBootstrap>{children}</OpsBootstrap>
        </main>
      </div>
    </div>
  );
}
