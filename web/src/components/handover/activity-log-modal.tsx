'use client';

import { closeOnOverlayClick } from '@/lib/ui/close-on-overlay-click';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { formatTime } from '@/lib/handover/card-utils';
import {
  activityBadgeLabel,
  activityBadgeTone,
  activityTargetLabel,
  ENTITY_LABELS,
  formatActivityActor,
  formatActivityDetail,
  formatActivityHeadline,
} from '@/lib/handover/activity-display';
import {
  ACTIVITY_ACTION_OPTIONS,
  ACTIVITY_ENTITY_OPTIONS,
  useActivityLogs,
  type ActivityLogFilters,
} from '@/lib/handover/use-activity-logs';

type ActivityLogModalProps = {
  open: boolean;
  onClose: () => void;
};

const DEFAULT_FILTERS: ActivityLogFilters = {
  entityType: 'all',
  action: 'all',
  query: '',
};

export function ActivityLogModal({ open, onClose }: ActivityLogModalProps) {
  const [filters, setFilters] = useState<ActivityLogFilters>(DEFAULT_FILTERS);
  const { data: logs = [], isLoading } = useActivityLogs({ limit: 150, filters, enabled: open });

  function updateFilters(patch: Partial<ActivityLogFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  if (!open) return null;

  const dialog = (
    <div className="modal-overlay modal-overlay--records" onClick={closeOnOverlayClick(onClose)}>
      <div className="modal modal--activity" onClick={(event) => event.stopPropagation()}>
        <div className="activity-modal">
          <div className="modal__header">
            <div>
              <h2>변경 기록</h2>
              <p className="shift-modal__sub">누가 · 무엇을 · 어떻게 바꿨는지 확인합니다 (실시간 갱신)</p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="activity-modal__filters">
            <input
              type="search"
              className="activity-modal__filter-search"
              value={filters.query}
              onChange={(event) => updateFilters({ query: event.target.value })}
              placeholder="요약·작성자 검색…"
              aria-label="변경 기록 검색"
            />
            <div className="activity-modal__filter-group">
              <select
                value={filters.entityType}
                onChange={(event) => updateFilters({ entityType: event.target.value })}
                aria-label="유형 필터"
              >
                {ACTIVITY_ENTITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={filters.action}
                onChange={(event) => updateFilters({ action: event.target.value })}
                aria-label="동작 필터"
              >
                {ACTIVITY_ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="activity-modal__body">
            {isLoading ? (
              <p className="shift-empty">불러오는 중…</p>
            ) : logs.length ? (
              logs.map((log) => {
                const target = activityTargetLabel(log.summary);
                const detail = formatActivityDetail(log);
                const tone = activityBadgeTone(log);
                const isComment = log.action === 'update' && log.summary.startsWith('댓글:');

                return (
                  <article key={log.id} className={`activity-item${tone ? ` activity-item--${tone}` : ''}`}>
                    <div className="activity-item__top">
                      <span className={`activity-item__badge activity-item__badge--${tone || 'default'}`}>
                        {activityBadgeLabel(log)}
                      </span>
                      <span className="activity-item__entity">{ENTITY_LABELS[log.entity_type] ?? log.entity_type}</span>
                      <time className="activity-item__time" dateTime={log.created_at}>
                        {formatTime(log.created_at)}
                      </time>
                    </div>

                    <p className="activity-item__headline">
                      <strong>{formatActivityActor(log)}</strong>
                      <span> {formatActivityHeadline(log)}</span>
                    </p>

                    {target ? <p className="activity-item__target">{target}</p> : null}

                    {detail ? (
                      <blockquote className={`activity-item__quote${isComment ? ' activity-item__quote--comment' : ''}`}>
                        {isComment ? '💬 ' : null}
                        {detail}
                      </blockquote>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <p className="shift-empty">조건에 맞는 변경 내역이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(dialog, document.body) : null;
}
