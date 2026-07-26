'use client';

import { TodayTaxiBar } from '@/components/transport/today-taxi-bar';

/** 상단 보조 알림 — 택시만 (공지는 primary topbar) */
export function TopbarAlertsStrip() {
  return (
    <div className="nova-topbar-alerts nova-topbar-alerts--compact" aria-label="알림">
      <TodayTaxiBar compact />
    </div>
  );
}
