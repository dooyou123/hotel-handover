'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { fetchCards } from '@/lib/handover/use-cards';
import { fetchNotices } from '@/lib/handover/use-notices';
import { buildTickerItems } from '@/lib/handover/ticker-feed';

export function AppTicker() {
  const { data: notices = [] } = useQuery({
    queryKey: ['notices', DEFAULT_HOTEL_ID],
    queryFn: fetchNotices,
  });
  const { data: cards = [] } = useQuery({
    queryKey: ['cards', DEFAULT_HOTEL_ID],
    queryFn: fetchCards,
  });

  const items = useMemo(() => buildTickerItems(notices, cards), [notices, cards]);

  const sequence = [...items, ...items];

  return (
    <div className="app-ticker" aria-live="polite" aria-label="업무 전광판">
      <div className="app-ticker__fade app-ticker__fade--left" aria-hidden />
      <div className="app-ticker__viewport">
        <div className="app-ticker__track">
          {sequence.map((item, index) => (
            <span
              key={`${item.id}-${index}`}
              className={`app-ticker__item app-ticker__item--${item.tone}`}
            >
              {item.text}
            </span>
          ))}
        </div>
      </div>
      <div className="app-ticker__fade app-ticker__fade--right" aria-hidden />
    </div>
  );
}
