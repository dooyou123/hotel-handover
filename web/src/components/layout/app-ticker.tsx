'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { fetchCards } from '@/lib/handover/use-cards';
import { fetchNotices } from '@/lib/handover/use-notices';
import { buildTickerItems, isTickerIdle, type TickerItem } from '@/lib/handover/ticker-feed';
import {
  getTickerActionLabel,
  getTickerIcon,
  getTickerItemHref,
  TICKER_RIBBON_MAX_VISIBLE,
} from '@/lib/handover/ticker-nav';

function TickerRibbon({ item, onNavigate }: { item: TickerItem; onNavigate: (id: string) => void }) {
  const actionLabel = getTickerActionLabel(item.id);

  return (
    <div className={`app-ticker__ribbon app-ticker__ribbon--${item.tone}`}>
      <button type="button" className="app-ticker__ribbon-main" onClick={() => onNavigate(item.id)}>
        <span className="app-ticker__ribbon-icon" aria-hidden>
          {getTickerIcon(item.id, item.tone)}
        </span>
        <span className="app-ticker__ribbon-label">{item.label}</span>
        <span className="app-ticker__ribbon-sep" aria-hidden>
          ·
        </span>
        <span className="app-ticker__ribbon-body">{item.body}</span>
      </button>
      {actionLabel ? (
        <button type="button" className="app-ticker__ribbon-action" onClick={() => onNavigate(item.id)}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function AppTicker() {
  const router = useRouter();
  const { data: notices = [] } = useQuery({
    queryKey: ['notices', DEFAULT_HOTEL_ID],
    queryFn: fetchNotices,
  });
  const { data: cards = [] } = useQuery({
    queryKey: ['cards', DEFAULT_HOTEL_ID],
    queryFn: fetchCards,
  });

  const items = useMemo(() => buildTickerItems(notices, cards), [notices, cards]);
  const idle = isTickerIdle(items);

  const visible = idle ? [] : items.slice(0, TICKER_RIBBON_MAX_VISIBLE);
  const overflow = idle ? 0 : Math.max(0, items.length - TICKER_RIBBON_MAX_VISIBLE);

  function handleNavigate(id: string) {
    const href = getTickerItemHref(id);
    if (href) router.push(href);
  }

  if (idle) return null;

  return (
    <div className="app-ticker app-ticker--ribbons" aria-live="polite" aria-label="업무 알림">
      {visible.map((item) => (
        <TickerRibbon key={item.id} item={item} onNavigate={handleNavigate} />
      ))}
      {overflow > 0 ? (
        <button type="button" className="app-ticker__more" onClick={() => router.push('/handover')}>
          +{overflow}건 더 보기
        </button>
      ) : null}
    </div>
  );
}
