'use client';

import Link from 'next/link';
import { AppNav } from '@/components/layout/app-nav';
import { AppHeaderActions } from '@/components/layout/app-header-actions';
import { NavRouteGuard } from '@/components/layout/nav-route-guard';
import { OpsBootstrap } from '@/components/layout/ops-bootstrap';
import { TopbarAlertsStrip } from '@/components/layout/topbar-alerts-strip';
import { AppTicker } from '@/components/layout/app-ticker';
import { SessionBar } from '@/components/layout/session-bar';
import { ScheduleConfirmBanner } from '@/components/schedules/schedule-confirm-banner';
import { StaffOnboardingModal } from '@/components/onboarding/staff-onboarding-modal';
import { DailyHandoverWelcome } from '@/components/onboarding/daily-handover-welcome';
import { MobileNavBackdrop, MobileNavProvider, MobileNavTrigger, useMobileNav } from '@/components/layout/mobile-nav';

type AppShellNovaProps = {
  email: string;
  children: React.ReactNode;
};

function AppShellNovaInner({ email, children }: AppShellNovaProps) {
  const { open, closeNav } = useMobileNav();

  return (
    <div className={`nova-shell${open ? ' is-nav-open' : ''}`}>
      <MobileNavBackdrop />
      <aside
        className="nova-sidebar"
        aria-label="주 메뉴"
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <div className="nova-sidebar__head">
          <Link href="/handover" className="nova-sidebar__brand" onClick={closeNav}>
            <strong>프런트 인수인계</strong>
          </Link>
          <button type="button" className="nova-sidebar__close" aria-label="메뉴 닫기" onClick={closeNav}>
            ✕
          </button>
        </div>
        <AppNav />
        <div className="nova-sidebar__foot">
          <Link href="/help" className="nova-sidebar__foot-link" onClick={closeNav}>
            도움말
          </Link>
        </div>
      </aside>

      <div className="nova-main">
        <NavRouteGuard />
        <div className="nova-topbar-stack">
          <header className="nova-topbar nova-topbar--primary">
            <MobileNavTrigger />
            <AppTicker />
            <div className="nova-topbar__end">
              <time className="nova-topbar__date" dateTime={new Date().toISOString().slice(0, 10)}>
                {new Date().toLocaleDateString('ko-KR', {
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </time>
              <SessionBar email={email} />
              <AppHeaderActions />
            </div>
          </header>
          <div className="nova-topbar-stack__secondary">
            <ScheduleConfirmBanner />
            <TopbarAlertsStrip />
          </div>
        </div>
        <main className="nova-content">
          <OpsBootstrap>{children}</OpsBootstrap>
        </main>
      </div>
      <StaffOnboardingModal />
      <DailyHandoverWelcome />
    </div>
  );
}

export function AppShellNova({ email, children }: AppShellNovaProps) {
  return (
    <MobileNavProvider>
      <AppShellNovaInner email={email}>{children}</AppShellNovaInner>
    </MobileNavProvider>
  );
}
