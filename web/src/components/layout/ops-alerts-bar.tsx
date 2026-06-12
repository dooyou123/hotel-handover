'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { fetchAmenityInventoryData } from '@/lib/amenity/api';

export function OpsAlertsBar() {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const { data: amenityData } = useQuery({
    queryKey: ['amenity', DEFAULT_HOTEL_ID],
    queryFn: () => fetchAmenityInventoryData(),
    refetchInterval: 60_000,
  });

  const lowStock = useMemo(() => {
    if (!amenityData?.items) return [];
    return amenityData.items.filter((item) => item.minQuantity > 0 && item.quantity <= item.minQuantity);
  }, [amenityData]);

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
    return list;
  }, [lowStock, dismissed]);

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
