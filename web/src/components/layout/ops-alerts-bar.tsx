'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { fetchAmenityInventoryData } from '@/lib/amenity/api';
import { createClient } from '@/lib/supabase/client';
import type { TransportBooking } from '@/lib/transport/types';

function minutesUntilPickup(booking: TransportBooking): number {
  const time = booking.pickup_time.slice(0, 5);
  const target = new Date(`${booking.booking_date}T${time}:00`);
  return Math.round((target.getTime() - Date.now()) / 60_000);
}

async function fetchTodayPendingTransport(): Promise<TransportBooking[]> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('transport_bookings')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('booking_date', today)
    .eq('status', 'pending')
    .order('pickup_time');
  if (error) throw error;
  return (data ?? []) as TransportBooking[];
}

export function OpsAlertsBar() {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const { data: amenityData } = useQuery({
    queryKey: ['amenity', DEFAULT_HOTEL_ID],
    queryFn: () => fetchAmenityInventoryData(),
    refetchInterval: 60_000,
  });

  const { data: transports = [] } = useQuery({
    queryKey: ['transport-today-pending', DEFAULT_HOTEL_ID],
    queryFn: fetchTodayPendingTransport,
    refetchInterval: 60_000,
  });

  const lowStock = useMemo(() => {
    if (!amenityData?.items) return [];
    return amenityData.items.filter((item) => item.minQuantity > 0 && item.quantity <= item.minQuantity);
  }, [amenityData]);

  const upcoming = useMemo(
    () => transports.filter((b) => {
      const mins = minutesUntilPickup(b);
      return mins >= 0 && mins <= 30;
    }),
    [transports],
  );

  const alerts = useMemo(() => {
    const list: { id: string; message: React.ReactNode; href?: string }[] = [];
    if (lowStock.length && !dismissed.has('amenity')) {
      list.push({
        id: 'amenity',
        message: (
          <>
            어메니티 재고 부족 <strong>{lowStock.length}</strong>종 — {lowStock.map((i) => i.name).join(', ')}
          </>
        ),
        href: '/amenity',
      });
    }
    for (const booking of upcoming) {
      const id = `transport-${booking.id}`;
      if (dismissed.has(id)) continue;
      const mins = minutesUntilPickup(booking);
      list.push({
        id,
        message: (
          <>
            택시 픽업 <strong>{mins}분 후</strong> — {booking.room_number || '—'}호 {booking.guest_name || ''}{' '}
            {booking.destination ? `→ ${booking.destination}` : ''}
          </>
        ),
        href: '/transport',
      });
    }
    return list;
  }, [lowStock, upcoming, dismissed]);

  if (!alerts.length) return null;

  return (
    <div className="ops-alerts" role="status">
      {alerts.map((alert) => (
        <div key={alert.id} className="ops-alerts__item">
          {alert.href ? (
            <Link href={alert.href} className="ops-alerts__text">
              {alert.message}
            </Link>
          ) : (
            <span className="ops-alerts__text">{alert.message}</span>
          )}
          <button
            type="button"
            className="ops-alerts__dismiss"
            onClick={() => setDismissed((prev) => new Set(prev).add(alert.id))}
            aria-label="알림 닫기"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
