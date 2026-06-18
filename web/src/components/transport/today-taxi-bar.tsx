'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { filterPendingTodayTaxi } from '@/lib/today/alerts';
import {
  formatTodayTaxiBarText,
  isPickupOverdue,
  isUpcomingTransportAlert,
  minutesUntilPickup,
  sortTodayTaxiBarBookings,
  TRANSPORT_ALERT_WINDOW_MINUTES,
} from '@/lib/transport/alerts';
import { useTodayPendingTransport } from '@/lib/transport/use-transport';

export function TodayTaxiBar() {
  const [now, setNow] = useState(() => new Date());
  const { data: bookings = [] } = useTodayPendingTransport(30_000);
  const pending = useMemo(() => {
    const today = filterPendingTodayTaxi(bookings);
    return sortTodayTaxiBarBookings(today, now);
  }, [bookings, now]);

  const hasImminent = pending.some((booking) =>
    isUpcomingTransportAlert(booking, TRANSPORT_ALERT_WINDOW_MINUTES, now),
  );

  useEffect(() => {
    const intervalMs = hasImminent ? 30_000 : 60_000;
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [hasImminent]);

  if (!pending.length) return null;

  return (
    <div
      className={`today-taxi-bar${hasImminent ? ' today-taxi-bar--imminent' : ''}`}
      role="status"
      aria-label="오늘 택시 예약"
    >
      {pending.map((booking) => {
        const overdue = isPickupOverdue(booking, now);
        const imminent = isUpcomingTransportAlert(booking, TRANSPORT_ALERT_WINDOW_MINUTES, now);
        const mins = minutesUntilPickup(booking, now);

        return (
          <Link
            key={booking.id}
            href="/transport"
            className={[
              'today-taxi-bar__item',
              overdue ? 'today-taxi-bar__item--overdue' : '',
              imminent ? 'today-taxi-bar__item--imminent' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span
              className={[
                'today-taxi-bar__time',
                imminent ? 'today-taxi-bar__time--imminent' : '',
                overdue ? 'today-taxi-bar__time--overdue' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {imminent && !overdue ? `${Math.max(mins, 0)}분` : booking.pickup_time.slice(0, 5)}
            </span>
            {imminent && !overdue ? (
              <span className="today-taxi-bar__badge" aria-hidden>
                ⏰ 곧 픽업
              </span>
            ) : null}
            <span className="today-taxi-bar__text">{formatTodayTaxiBarText(booking, now)}</span>
          </Link>
        );
      })}
    </div>
  );
}
