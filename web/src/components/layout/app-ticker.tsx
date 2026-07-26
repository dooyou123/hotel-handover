'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { fetchCards } from '@/lib/handover/use-cards';
import { fetchNotices } from '@/lib/handover/use-notices';
import { buildTickerItems, isTickerIdle, type TickerItem } from '@/lib/handover/ticker-feed';
import {
  getTickerActionLabel,
  getTickerItemHref,
  sortTickerItemsForDisplay,
} from '@/lib/handover/ticker-nav';

export function AppTicker() {
  const router = useRouter();
  const [listOpen, setListOpen] = useState(false);
  const { data: notices = [] } = useQuery({
    queryKey: ['notices', DEFAULT_HOTEL_ID],
    queryFn: fetchNotices,
  });
  const { data: cards = [] } = useQuery({
    queryKey: ['cards', DEFAULT_HOTEL_ID],
    queryFn: fetchCards,
  });

  const items = useMemo(() => sortTickerItemsForDisplay(buildTickerItems(notices, cards)), [notices, cards]);
  const idle = isTickerIdle(items);
  const activeItems = idle ? [] : items;
  const current = activeItems[0];
  const moreCount = Math.max(0, activeItems.length - 1);

  if (!current) return null;

  function handleNavigate(id: string) {
    setListOpen(false);
    const href = getTickerItemHref(id);
    if (href) router.push(href);
  }

  const actionLabel = getTickerActionLabel(current.id) || '열기';

  return (
    <div
      className={`app-ticker app-ticker--headline app-ticker--headline--${current.tone}`}
      aria-label="공지·업무 알림"
    >
      <button
        type="button"
        className="app-ticker__headline-main"
        onClick={() => handleNavigate(current.id)}
        title={`${current.label} · ${current.body}`}
      >
        <span className="app-ticker__headline-label">{current.label}</span>
        <span className="app-ticker__headline-body">{current.body}</span>
        <span className="app-ticker__headline-action">{actionLabel}</span>
      </button>

      {moreCount > 0 ? (
        <details
          className="app-ticker__headline-more"
          open={listOpen}
          onToggle={(event) => setListOpen(event.currentTarget.open)}
        >
          <summary className="app-ticker__headline-more-toggle">외 {moreCount}건</summary>
          <div className="app-ticker__headline-more-panel" role="list">
            {activeItems.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="listitem"
                className={`app-ticker__headline-more-item app-ticker__headline-more-item--${item.tone}${
                  index === 0 ? ' is-current' : ''
                }`}
                onClick={() => handleNavigate(item.id)}
              >
                <span className="app-ticker__headline-more-label">{item.label}</span>
                <span className="app-ticker__headline-more-body">{item.body}</span>
              </button>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
