'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ActivityRecordItem,
  ShiftHandoverRecordItem,
} from '@/components/handover/handover-record-items';
import {
  defaultShiftHandoverFilters,
  SHIFT_HANDOVER_SHIFT_OPTIONS,
  type HandoverRecordsTab,
  type ShiftHandoverFilters,
} from '@/lib/handover/records';
import { todayDateString } from '@/lib/handover/shift-summary';
import {
  ACTIVITY_ACTION_OPTIONS,
  ACTIVITY_ENTITY_OPTIONS,
  useActivityLogs,
  useShiftHandovers,
  type ActivityLogFilters,
} from '@/lib/handover/use-activity-logs';
type HandoverRecordsModalProps = {
  open: boolean;
  initialTab?: HandoverRecordsTab;
  onClose: () => void;
};

const DEFAULT_ACTIVITY_FILTERS: ActivityLogFilters = {
  entityType: 'all',
  action: 'all',
  query: '',
};

export function HandoverRecordsModal({
  open,
  initialTab = 'shift',
  onClose,
}: HandoverRecordsModalProps) {
  const [tab, setTab] = useState<HandoverRecordsTab>(initialTab);
  const [shiftFilters, setShiftFilters] = useState<ShiftHandoverFilters>(defaultShiftHandoverFilters);
  const [activityFilters, setActivityFilters] = useState<ActivityLogFilters>(DEFAULT_ACTIVITY_FILTERS);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const { data: shiftRecords = [], isLoading: shiftLoading } = useShiftHandovers({
    limit: shiftFilters.todayOnly && !shiftFilters.workDate.trim() ? 80 : 120,
    filters: shiftFilters,
    enabled: open && tab === 'shift',
  });
  const { data: activityLogs = [], isLoading: activityLoading } = useActivityLogs({
    limit: 150,
    filters: activityFilters,
    enabled: open && tab === 'activity',
  });
  function updateShiftFilters(patch: Partial<ShiftHandoverFilters>) {
    setShiftFilters((prev) => ({ ...prev, ...patch }));
  }

  function updateActivityFilters(patch: Partial<ActivityLogFilters>) {
    setActivityFilters((prev) => ({ ...prev, ...patch }));
  }

  if (!open) return null;

  const dialog = (
    <div className="modal-overlay modal-overlay--records" onClick={onClose}>
      <div className="modal modal--activity" onClick={(event) => event.stopPropagation()}>
        <div className="activity-modal">
          <div className="modal__header">
            <div>
              <h2>기록 보기</h2>
              <p className="shift-modal__sub">교대 스냅샷과 업무 변경 이력을 확인합니다.</p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="records-modal__tabs" role="tablist" aria-label="기록 종류">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'shift'}
              className={`records-modal__tab${tab === 'shift' ? ' is-active' : ''}`}
              onClick={() => setTab('shift')}
            >
              교대 기록
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'activity'}
              className={`records-modal__tab${tab === 'activity' ? ' is-active' : ''}`}
              onClick={() => setTab('activity')}
            >
              변경 기록
            </button>
          </div>

          {tab === 'shift' ? (
            <div className="activity-modal__filters records-modal__filters">
              <div className="activity-modal__filter-group">
                <label className="records-modal__today">
                  <input
                    type="checkbox"
                    checked={shiftFilters.todayOnly && !shiftFilters.workDate.trim()}
                    onChange={(event) => {
                      if (event.target.checked) {
                        updateShiftFilters({ todayOnly: true, workDate: '' });
                      } else {
                        updateShiftFilters({ todayOnly: false });
                      }
                    }}
                  />
                  오늘만
                </label>
                <input
                  type="date"
                  value={shiftFilters.workDate}
                  max={todayDateString()}
                  onChange={(event) =>
                    updateShiftFilters({
                      workDate: event.target.value,
                      todayOnly: !event.target.value,
                    })
                  }
                  aria-label="날짜"
                />
                <select
                  value={shiftFilters.shift}
                  onChange={(event) => updateShiftFilters({ shift: event.target.value })}
                  aria-label="교대 필터"
                >
                  {SHIFT_HANDOVER_SHIFT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="search"
                className="activity-modal__filter-search"
                value={shiftFilters.query}
                onChange={(event) => updateShiftFilters({ query: event.target.value })}
                placeholder="이름·메모 검색…"
                aria-label="교대 기록 검색"
              />
            </div>
          ) : (
            <div className="activity-modal__filters">
              <input
                type="search"
                className="activity-modal__filter-search"
                value={activityFilters.query}
                onChange={(event) => updateActivityFilters({ query: event.target.value })}
                placeholder="요약·작성자 검색…"
                aria-label="변경 기록 검색"
              />
              <div className="activity-modal__filter-group">
                <select
                  value={activityFilters.entityType}
                  onChange={(event) => updateActivityFilters({ entityType: event.target.value })}
                  aria-label="유형 필터"
                >
                  {ACTIVITY_ENTITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={activityFilters.action}
                  onChange={(event) => updateActivityFilters({ action: event.target.value })}
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
          )}

          <div className="activity-modal__body">
            {tab === 'shift' ? (
              shiftLoading ? (
                <p className="shift-empty">불러오는 중…</p>
              ) : shiftRecords.length ? (
                shiftRecords.map((record) => <ShiftHandoverRecordItem key={record.id} record={record} />)
              ) : (
                <p className="shift-empty">조건에 맞는 교대 기록이 없습니다.</p>
              )
            ) : activityLoading ? (
              <p className="shift-empty">불러오는 중…</p>
            ) : activityLogs.length ? (
              activityLogs.map((log) => <ActivityRecordItem key={log.id} log={log} />)
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
