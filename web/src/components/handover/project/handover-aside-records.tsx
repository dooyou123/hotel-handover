'use client';

import { useMemo, useState } from 'react';
import {
  ActivityPreviewItem,
  buildTodayRecordTimeline,
  ShiftHandoverPreviewItem,
} from '@/components/handover/handover-record-items';
import type { HandoverRecordsTab } from '@/lib/handover/records';
import {
  ASIDE_FEED_DISPLAY_LIMIT,
  type AsideFeedTab,
} from '@/lib/handover/shift-ui-state';
import { defaultShiftHandoverFilters } from '@/lib/handover/records';
import type { ActivityLog } from '@/lib/handover/types';
import { useShiftHandovers, useTodayActivityLogs } from '@/lib/handover/use-activity-logs';

const FEED_FETCH_LIMIT = 40;

type HandoverAsideRecordsProps = {
  onOpenRecords: (tab: HandoverRecordsTab) => void;
  onOpenCardById?: (cardId: string) => void;
};

const FEED_TABS: { id: AsideFeedTab; label: string; modalTab?: HandoverRecordsTab }[] = [
  { id: 'all', label: '전체' },
  { id: 'shift', label: '교대', modalTab: 'shift' },
  { id: 'activity', label: '변경', modalTab: 'activity' },
];

export function HandoverAsideRecords({ onOpenRecords, onOpenCardById }: HandoverAsideRecordsProps) {
  const [feedTab, setFeedTab] = useState<AsideFeedTab>('all');

  const { data: shiftLogs = [], isLoading: shiftLoading } = useShiftHandovers({
    limit: FEED_FETCH_LIMIT,
    filters: defaultShiftHandoverFilters(),
  });
  const { data: activityLogs = [], isLoading: activityLoading } = useTodayActivityLogs(FEED_FETCH_LIMIT);

  const timeline = useMemo(
    () => buildTodayRecordTimeline(shiftLogs, activityLogs, feedTab),
    [shiftLogs, activityLogs, feedTab],
  );
  const visible = timeline.slice(0, ASIDE_FEED_DISPLAY_LIMIT);
  const hasMore = timeline.length > visible.length;
  const loading = shiftLoading || activityLoading;

  function handleActivityClick(log: ActivityLog) {
    if (log.entity_type === 'card' && log.entity_id && onOpenCardById) {
      onOpenCardById(log.entity_id);
      return;
    }
    onOpenRecords('activity');
  }

  function openModalForTab(tab: AsideFeedTab) {
    const match = FEED_TABS.find((item) => item.id === tab);
    onOpenRecords(match?.modalTab ?? (tab === 'shift' ? 'shift' : 'activity'));
  }

  return (
    <section className="aside-card aside-card--records" aria-label="오늘 기록">
      <div className="aside-records__head">
        <h3 className="aside-card__title">오늘 기록</h3>
        <div className="aside-records__tabs" role="tablist" aria-label="기록 필터">
          {FEED_TABS.map((item) => {
            const count =
              item.id === 'shift'
                ? shiftLogs.length
                : item.id === 'activity'
                  ? activityLogs.length
                  : shiftLogs.length + activityLogs.length;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={feedTab === item.id}
                className={`aside-records__tab${feedTab === item.id ? ' is-active' : ''}`}
                onClick={() => setFeedTab(item.id)}
              >
                {item.label}
                {item.id !== 'all' && count > 0 ? (
                  <span className="aside-records__count">{count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <p className="aside-records__empty">불러오는 중…</p>
      ) : visible.length ? (
        <ul className="aside-records__list">
          {visible.map((entry) =>
            entry.kind === 'shift' ? (
              <ShiftHandoverPreviewItem
                key={`shift-${entry.record.id}`}
                record={entry.record}
                onClick={() => onOpenRecords('shift')}
              />
            ) : (
              <ActivityPreviewItem
                key={`activity-${entry.log.id}`}
                log={entry.log}
                onClick={() => handleActivityClick(entry.log)}
              />
            ),
          )}
        </ul>
      ) : (
        <p className="aside-records__empty">
          {feedTab === 'shift'
            ? '오늘 교대 기록이 없습니다.'
            : feedTab === 'activity'
              ? '오늘 변경 기록이 없습니다.'
              : '오늘 기록이 없습니다.'}
        </p>
      )}

      {hasMore ? (
        <button
          type="button"
          className="aside-records__more"
          onClick={() => openModalForTab(feedTab)}
        >
          더 보기 ({timeline.length - visible.length}건)
        </button>
      ) : null}
    </section>
  );
}
