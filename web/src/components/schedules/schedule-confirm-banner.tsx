'use client';

import Link from 'next/link';
import { formatMonthLabel } from '@/lib/schedules/api';
import { useScheduleConfirmAlerts } from '@/lib/schedules/use-schedule-alerts';

export function ScheduleConfirmBanner() {
  const { alerts, staffName } = useScheduleConfirmAlerts();
  if (!staffName || alerts.length === 0) return null;

  const first = alerts[0];
  const more = alerts.length - 1;

  return (
    <div className="schedule-confirm-banner" role="status">
      <p className="schedule-confirm-banner__text">
        <strong>{staffName}</strong> 님, 스케줄 확인이 필요합니다 ·{' '}
        {formatMonthLabel(first.monthKey)} v{first.version}
        {more > 0 ? ` 외 ${more}건` : ''}
      </p>
      <Link
        href={`/schedules?month=${encodeURIComponent(first.monthKey)}`}
        className="schedule-confirm-banner__action"
      >
        확인하러 가기
      </Link>
    </div>
  );
}
