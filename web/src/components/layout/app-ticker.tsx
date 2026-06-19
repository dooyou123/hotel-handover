'use client';

import { useEffect, useMemo, useState } from 'react';
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

const AUTO_ADVANCE_MS = 8_000;

export function AppTicker() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
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
  const current = activeItems[index] ?? activeItems[0];
  const hasMultiple = activeItems.length > 1;

  useEffect(() => {
    setIndex(0);
  }, [activeItems.length, activeItems[0]?.id]);

  useEffect(() => {
    if (!hasMultiple || paused) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % activeItems.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [activeItems.length, hasMultiple, paused]);

  function handleNavigate(id: string) {
    const href = getTickerItemHref(id);
    if (href) router.push(href);
  }

  function showPrevious() {
    setIndex((prev) => (prev - 1 + activeItems.length) % activeItems.length);
  }

  function showNext() {
    setIndex((prev) => (prev + 1) % activeItems.length);
  }

  if (idle || !current) return null;

  const actionLabel = getTickerActionLabel(current.id) || '열기';

  return (
    <div
      className={`app-ticker app-ticker--carousel app-ticker--carousel--${current.tone}`}
      aria-label="업무 알림"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <button
        type="button"
        className="app-ticker__carousel-main"
        onClick={() => handleNavigate(current.id)}
        title={`${current.label} · ${current.body}`}
      >
        <span className="app-ticker__carousel-label">{current.label}</span>
        <span className="app-ticker__carousel-sep" aria-hidden>
          ·
        </span>
        <span className="app-ticker__carousel-body">{current.body}</span>
        <span className="app-ticker__carousel-action">{actionLabel}</span>
      </button>

      {hasMultiple ? (
        <div className="app-ticker__carousel-controls">
          <button type="button" className="app-ticker__carousel-step" onClick={showPrevious} aria-label="이전 알림">
            ‹
          </button>
          <span className="app-ticker__carousel-count" aria-live="polite">
            {index + 1}/{activeItems.length}
          </span>
          <button type="button" className="app-ticker__carousel-step" onClick={showNext} aria-label="다음 알림">
            ›
          </button>
          <details className="app-ticker__carousel-list">
            <summary className="app-ticker__carousel-list-toggle">목록</summary>
            <div className="app-ticker__carousel-list-panel">
              {activeItems.map((item, itemIndex) => (
                <button
                  key={item.id}
                  type="button"
                  className={`app-ticker__carousel-list-item app-ticker__carousel-list-item--${item.tone}${
                    itemIndex === index ? ' is-active' : ''
                  }`}
                  onClick={() => {
                    setIndex(itemIndex);
                    handleNavigate(item.id);
                  }}
                >
                  <span className="app-ticker__carousel-list-label">{item.label}</span>
                  <span className="app-ticker__carousel-list-body">{item.body}</span>
                </button>
              ))}
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}
