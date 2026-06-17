'use client';

import { getComplaintSla } from '@/lib/handover/complaint-sla';
import type { Card } from '@/lib/handover/types';

type ComplaintSlaBadgeProps = {
  card: Card;
};

export function ComplaintSlaBadge({ card }: ComplaintSlaBadgeProps) {
  const sla = getComplaintSla(card);
  if (!sla) return null;

  return (
    <span className={`complaint-sla complaint-sla--${sla.status}`} title={`컴플레인 처리 기한 · ${sla.label}`}>
      {sla.label}
    </span>
  );
}
