'use client';

import { AppTicker } from '@/components/layout/app-ticker';
import { TodayTaxiBar } from '@/components/transport/today-taxi-bar';

/** 티커·택시 알림을 한 줄에 압축 */
export function TopbarAlertsStrip() {
  return (
    <div className="nova-topbar-alerts" aria-label="긴급 알림">
      <AppTicker />
      <TodayTaxiBar compact />
    </div>
  );
}
