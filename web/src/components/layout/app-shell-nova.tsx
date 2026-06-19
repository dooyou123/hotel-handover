'use client';

import Link from 'next/link';
import { AppNav } from '@/components/layout/app-nav';
import { AppHeaderActions } from '@/components/layout/app-header-actions';
import { TodayStaffBar } from '@/components/schedule/today-staff-bar';
import { NavRouteGuard } from '@/components/layout/nav-route-guard';
import { OpsBootstrap } from '@/components/layout/ops-bootstrap';
import { TopbarAlertsStrip } from '@/components/layout/topbar-alerts-strip';
import { SessionBar } from '@/components/layout/session-bar';
import { SessionScheduleMismatchBanner } from '@/components/schedule/session-schedule-mismatch-banner';
import { StaffOnboardingModal } from '@/components/onboarding/staff-onboarding-modal';
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
      <aside className="nova-sidebar" aria-label="주 메뉴">
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
          <header className="nova-topbar">
            <MobileNavTrigger />
            <TodayStaffBar variant="compact" />
            <div className="nova-topbar__end">
              <SessionBar email={email} />
              <AppHeaderActions />
            </div>
          </header>
          <SessionScheduleMismatchBanner />
          <TopbarAlertsStrip />
        </div>
        <main className="nova-content">
          <OpsBootstrap>{children}</OpsBootstrap>
        </main>
      </div>
      <StaffOnboardingModal />
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
