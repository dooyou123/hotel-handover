'use client';

import { useMemo, useState } from 'react';
import { formatTime } from '@/lib/handover/card-utils';
import {
  activityBadgeLabel,
  activityBadgeTone,
  formatActivityActor,
  formatActivityDetail,
  formatActivityHeadline,
} from '@/lib/handover/activity-display';
import { useActivityLogs } from '@/lib/handover/use-activity-logs';

const FULL_HISTORY_LIMIT = 100;

type CardActivityTimelineProps = {
  cardId: string;
  limit?: number;
};

export function CardActivityTimeline({ cardId, limit = 8 }: CardActivityTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const effectiveLimit = showAll ? FULL_HISTORY_LIMIT : limit;

  const filters = useMemo(
    () => ({
      entityType: 'card',
      entityId: cardId,
      action: 'all',
      query: '',
    }),
    [cardId],
  );

  const { data: logs = [], isLoading } = useActivityLogs({
    limit: effectiveLimit,
    filters,
    enabled: Boolean(cardId),
  });

  if (isLoading) {
    return (
      <section className="drawer-section card-activity-timeline">
        <h3 className="drawer-section__title">활동 기록</h3>
        <p className="card-activity-timeline__empty">불러오는 중…</p>
      </section>
    );
  }

  if (!logs.length) return null;

  return (
    <section className="drawer-section card-activity-timeline">
      <h3 className="drawer-section__title">활동 기록</h3>
      <ul className="card-activity-timeline__list">
        {logs.map((log) => {
          const tone = activityBadgeTone(log);
          const detail = formatActivityDetail(log);
          return (
            <li key={log.id} className="card-activity-timeline__item">
              <div className="card-activity-timeline__head">
                <span className={`card-activity-timeline__badge${tone ? ` card-activity-timeline__badge--${tone}` : ''}`}>
                  {activityBadgeLabel(log)}
                </span>
                <time className="card-activity-timeline__time" dateTime={log.created_at}>
                  {formatTime(log.created_at)}
                </time>
              </div>
              <p className="card-activity-timeline__text">{formatActivityHeadline(log)}</p>
              {detail ? <p className="card-activity-timeline__detail">{detail}</p> : null}
              <p className="card-activity-timeline__actor">{formatActivityActor(log)}</p>
            </li>
          );
        })}
      </ul>
      {!showAll && logs.length >= limit ? (
        <button
          type="button"
          className="card-activity-timeline__more"
          onClick={() => setShowAll(true)}
        >
          전체 이력 보기
        </button>
      ) : null}
    </section>
  );
}
