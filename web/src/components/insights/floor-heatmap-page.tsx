'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { getNavPageMeta } from '@/lib/nav/page-meta';
import { fetchArchivedCards, fetchCards } from '@/lib/handover/use-cards';
import { buildFloorHeatmap, type FloorHeatmapLookback } from '@/lib/insights/floor-heatmap';
import { KNOWN_HOTEL_FLOORS } from '@/lib/insights/room-floor';
import { fetchReviews } from '@/lib/reviews/use-reviews';

const LOOKBACK_OPTIONS: { id: FloorHeatmapLookback; label: string }[] = [
  { id: 7, label: '최근 7일' },
  { id: 30, label: '최근 30일' },
];

export function FloorHeatmapPageClient() {
  const pageMeta = getNavPageMeta('/insights/floor');
  const [lookbackDays, setLookbackDays] = useState<FloorHeatmapLookback>(7);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);

  const { data: cards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ['cards', DEFAULT_HOTEL_ID],
    queryFn: fetchCards,
  });
  const { data: archivedCards = [], isLoading: archivedLoading } = useQuery({
    queryKey: ['cards-archived', DEFAULT_HOTEL_ID],
    queryFn: fetchArchivedCards,
  });
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['guest-reviews', DEFAULT_HOTEL_ID],
    queryFn: fetchReviews,
  });

  const heatmap = useMemo(
    () =>
      buildFloorHeatmap({
        cards: [...cards, ...archivedCards],
        reviews,
        lookbackDays,
      }),
    [cards, archivedCards, reviews, lookbackDays],
  );

  const selectedCell = heatmap.cells.find((cell) => cell.floor === selectedFloor) ?? null;
  const isLoading = cardsLoading || archivedLoading || reviewsLoading;

  return (
    <section className="floor-heatmap-page">
      <header className="floor-heatmap-page__header">
        <div>
          <h2 className="floor-heatmap-page__title">{pageMeta.label}</h2>
          <p className="floor-heatmap-page__desc">{pageMeta.description}</p>
        </div>
        <div className="segmented-control segmented-control--compact">
          {LOOKBACK_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`segmented-control__btn${lookbackDays === opt.id ? ' is-active' : ''}`}
              onClick={() => {
                setLookbackDays(opt.id);
                setSelectedFloor(null);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      <div className="floor-heatmap-page__legend" aria-hidden>
        <span className="floor-heatmap-page__legend-item floor-heatmap-page__legend-item--none">없음</span>
        <span className="floor-heatmap-page__legend-item floor-heatmap-page__legend-item--low">낮음</span>
        <span className="floor-heatmap-page__legend-item floor-heatmap-page__legend-item--medium">보통</span>
        <span className="floor-heatmap-page__legend-item floor-heatmap-page__legend-item--high">높음</span>
      </div>

      {isLoading ? (
        <p className="empty-state">불러오는 중…</p>
      ) : (
        <div className="floor-heatmap-page__layout">
          <div className="floor-heatmap-page__grid" role="list" aria-label="층별 히트맵">
            {[...KNOWN_HOTEL_FLOORS].reverse().map((floor) => {
              const cell = heatmap.cells.find((item) => item.floor === floor);
              const intensity = cell?.intensity ?? 'none';
              const isSelected = selectedFloor === floor;
              return (
                <button
                  key={floor}
                  type="button"
                  role="listitem"
                  className={`floor-heatmap__cell floor-heatmap__cell--${intensity}${isSelected ? ' is-selected' : ''}`}
                  onClick={() => setSelectedFloor((prev) => (prev === floor ? null : floor))}
                >
                  <span className="floor-heatmap__floor">{floor}층</span>
                  <strong className="floor-heatmap__score">{cell?.totalScore ?? 0}</strong>
                  <span className="floor-heatmap__meta">
                    컴플레인 {cell?.complaintCount ?? 0} · 리뷰 {cell?.negativeReviewCount ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          <aside className="floor-heatmap-page__aside">
            {selectedCell ? (
              <>
                <h3>{selectedCell.floor}층 상세</h3>
                <dl className="floor-heatmap-page__stats">
                  <div>
                    <dt>인계</dt>
                    <dd>{selectedCell.handoverCount}</dd>
                  </div>
                  <div>
                    <dt>컴플레인</dt>
                    <dd>{selectedCell.complaintCount}</dd>
                  </div>
                  <div>
                    <dt>시설</dt>
                    <dd>{selectedCell.facilityCount}</dd>
                  </div>
                  <div>
                    <dt>룸이슈</dt>
                    <dd>{selectedCell.roomIssueCount}</dd>
                  </div>
                  <div>
                    <dt>부정 리뷰</dt>
                    <dd>{selectedCell.negativeReviewCount}</dd>
                  </div>
                </dl>

                {selectedCell.topRooms.length ? (
                  <div className="floor-heatmap-page__rooms">
                    <h4>이슈 많은 객실</h4>
                    <ul>
                      {selectedCell.topRooms.map((room) => (
                        <li key={room.room}>
                          <Link href={`/handover?search=${encodeURIComponent(room.room)}`} className="floor-heatmap-page__room-link">
                            <strong>{room.room}호</strong>
                            <span>
                              점수 {room.score}
                              {room.complaint ? ` · 컴플레인 ${room.complaint}` : ''}
                              {room.negativeReviews ? ` · 부정리뷰 ${room.negativeReviews}` : ''}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {selectedCell.recentEvents.length ? (
                  <div className="floor-heatmap-page__events">
                    <h4>최근 이슈 내용</h4>
                    <ul>
                      {selectedCell.recentEvents.map((event) => (
                        <li key={event.id}>
                          <Link href={event.href} className={`floor-heatmap-page__event floor-heatmap-page__event--${event.kind}`}>
                            <div className="floor-heatmap-page__event-head">
                              <span className="floor-heatmap-page__event-badge">{event.categoryLabel}</span>
                              <span className="floor-heatmap-page__event-room">{event.room}호</span>
                              <time className="floor-heatmap-page__event-date" dateTime={event.createdAt}>
                                {new Date(event.createdAt).toLocaleDateString('ko-KR', {
                                  month: 'numeric',
                                  day: 'numeric',
                                })}
                              </time>
                            </div>
                            <p className="floor-heatmap-page__event-title">{event.title}</p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="floor-heatmap-page__empty-floor">이 층에 집계된 이슈가 없습니다.</p>
                )}
              </>
            ) : (
              <div className="floor-heatmap-page__aside-empty">
                <h3>층을 선택하세요</h3>
                <p>
                  최근 {lookbackDays}일 기준 총 {heatmap.totalEvents}점 · 최대 층 점수 {heatmap.maxScore}
                </p>
                <p className="floor-heatmap-page__hint">색이 진할수록 민원·이슈가 많은 층입니다.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
