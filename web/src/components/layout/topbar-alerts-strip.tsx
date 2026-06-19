'use client';

import { AppTicker } from '@/components/layout/app-ticker';
import { TodayTaxiBar } from '@/components/transport/today-taxi-bar';

/** 티커·택시 알림 — 한 줄 캐러셀 */
export function TopbarAlertsStrip() {
  return (
    <div className="nova-topbar-alerts nova-topbar-alerts--compact" aria-label="긴급 알림">
      <AppTicker />
      <TodayTaxiBar compact />
    </div>
  );
}
