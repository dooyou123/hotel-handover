'use client';

import Link from 'next/link';
import { filterPendingTodayTaxi } from '@/lib/today/alerts';
import { formatTodayTaxiBarText, isPickupOverdue } from '@/lib/transport/alerts';
import { useTodayPendingTransport } from '@/lib/transport/use-transport';

export function TodayTaxiBar() {
  const { data: bookings = [] } = useTodayPendingTransport(60_000);
  const pending = filterPendingTodayTaxi(bookings);

  if (!pending.length) return null;

  return (
    <div className="today-taxi-bar" role="status" aria-label="오늘 택시 예약">
      {pending.map((booking) => {
        const overdue = isPickupOverdue(booking);
        return (
          <Link
            key={booking.id}
            href="/transport"
            className={`today-taxi-bar__item${overdue ? ' today-taxi-bar__item--overdue' : ''}`}
          >
            <span className="today-taxi-bar__time">{booking.pickup_time.slice(0, 5)}</span>
            <span className="today-taxi-bar__text">{formatTodayTaxiBarText(booking)}</span>
          </Link>
        );
      })}
    </div>
  );
}
