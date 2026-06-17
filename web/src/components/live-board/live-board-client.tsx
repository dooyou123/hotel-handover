'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { fetchCards } from '@/lib/handover/use-cards';
import { fetchNotices } from '@/lib/handover/use-notices';
import { buildLiveBoardFeed } from '@/lib/live-board/build-feed';
import { fetchTodayChecklistSummary } from '@/lib/live-board/checklist-summary';
import { useTodayTaxiBookings } from '@/lib/transport/use-transport';
import { useParcels } from '@/lib/parcels/use-parcels';

const REFRESH_MS = 45_000;

function formatClock(now: Date): string {
  return now.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function LiveBoardClient() {
  const [now, setNow] = useState(() => new Date());

  const { data: notices = [] } = useQuery({
    queryKey: ['notices', DEFAULT_HOTEL_ID],
    queryFn: fetchNotices,
    refetchInterval: REFRESH_MS,
  });
  const { data: cards = [] } = useQuery({
    queryKey: ['cards', DEFAULT_HOTEL_ID],
    queryFn: fetchCards,
    refetchInterval: REFRESH_MS,
  });
  const { data: checklist } = useQuery({
    queryKey: ['live-board-checklist', DEFAULT_HOTEL_ID],
    queryFn: fetchTodayChecklistSummary,
    refetchInterval: REFRESH_MS,
  });
  const { data: todayTaxi = [] } = useTodayTaxiBookings();
  const { parcels } = useParcels('all');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const feed = useMemo(
    () =>
      buildLiveBoardFeed({
        notices,
        cards,
        parcels,
        transportBookings: todayTaxi,
        checklist: checklist ?? null,
      }),
    [notices, cards, parcels, todayTaxi, checklist],
  );

  const urgentItems = feed.items.filter((item) => item.tone === 'urgent' && item.id !== 'idle');
  const warnItems = feed.items.filter((item) => item.tone === 'warn');
  const infoItems = feed.items.filter((item) => item.tone === 'info' && item.id !== 'idle');

  return (
    <div className="live-board">
      <header className="live-board__header">
        <div>
          <p className="live-board__eyebrow">LIVE</p>
          <h1 className="live-board__title">프런트 라이브 보드</h1>
        </div>
        <div className="live-board__header-meta">
          <time className="live-board__clock">{formatClock(now)}</time>
          <Link href="/handover" className="live-board__open-app">
            인수인계 열기
          </Link>
        </div>
      </header>

      {feed.summaries.length ? (
        <div className="live-board__summary" role="list" aria-label="요약">
          {feed.summaries.map((summary) => (
            <div
              key={summary.id}
              className={`live-board__summary-chip live-board__summary-chip--${summary.tone}`}
              role="listitem"
            >
              <span>{summary.label}</span>
              <strong>{summary.count}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {feed.checklist ? (
        <div className="live-board__checklist" role="status">
          <div className="live-board__checklist-head">
            <span>체크리스트</span>
            <strong>
              {feed.checklist.completed}/{feed.checklist.total}
            </strong>
          </div>
          <div className="live-board__checklist-track" aria-hidden>
            <div
              className="live-board__checklist-fill"
              style={{
                width: `${feed.checklist.total ? Math.round((feed.checklist.completed / feed.checklist.total) * 100) : 0}%`,
              }}
            />
          </div>
          <p className="live-board__checklist-label">{feed.checklist.label}</p>
        </div>
      ) : null}

      <div className="live-board__columns">
        <section className="live-board__column live-board__column--urgent">
          <h2>긴급</h2>
          {urgentItems.length ? (
            <ul className="live-board__list">
              {urgentItems.map((item) => (
                <li key={item.id}>
                  {item.href ? (
                    <Link href={item.href} className={`live-board__item live-board__item--${item.tone}`}>
                      <span className="live-board__item-label">{item.label}</span>
                      <span className="live-board__item-body">{item.body}</span>
                    </Link>
                  ) : (
                    <div className={`live-board__item live-board__item--${item.tone}`}>
                      <span className="live-board__item-label">{item.label}</span>
                      <span className="live-board__item-body">{item.body}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="live-board__empty">긴급 항목 없음</p>
          )}
        </section>

        <section className="live-board__column live-board__column--warn">
          <h2>주의</h2>
          {warnItems.length ? (
            <ul className="live-board__list">
              {warnItems.map((item) => (
                <li key={item.id}>
                  {item.href ? (
                    <Link href={item.href} className={`live-board__item live-board__item--${item.tone}`}>
                      <span className="live-board__item-label">{item.label}</span>
                      <span className="live-board__item-body">{item.body}</span>
                    </Link>
                  ) : (
                    <div className={`live-board__item live-board__item--${item.tone}`}>
                      <span className="live-board__item-label">{item.label}</span>
                      <span className="live-board__item-body">{item.body}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="live-board__empty">주의 항목 없음</p>
          )}
        </section>

        <section className="live-board__column live-board__column--info">
          <h2>공지</h2>
          {infoItems.length ? (
            <ul className="live-board__list">
              {infoItems.map((item) => (
                <li key={item.id}>
                  {item.href ? (
                    <Link href={item.href} className={`live-board__item live-board__item--${item.tone}`}>
                      <span className="live-board__item-label">{item.label}</span>
                      <span className="live-board__item-body">{item.body}</span>
                    </Link>
                  ) : (
                    <div className={`live-board__item live-board__item--${item.tone}`}>
                      <span className="live-board__item-label">{item.label}</span>
                      <span className="live-board__item-body">{item.body}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="live-board__empty">고정 공지 없음</p>
          )}
        </section>
      </div>

      <footer className="live-board__footer">
        <span>45초마다 자동 갱신</span>
        <span>
          마지막 갱신{' '}
          {new Date(feed.generatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </footer>
    </div>
  );
}
