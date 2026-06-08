'use client';

import { QUICK_FILTERS } from '@/lib/handover/constants';
import type { HandoverViewMode, QuickFilter } from '@/lib/handover/types';

type BoardToolbarProps = {
  viewMode: HandoverViewMode;
  searchQuery: string;
  quickFilter: QuickFilter;
  doneCount: number;
  isManager: boolean;
  onViewModeChange: (mode: HandoverViewMode) => void;
  onSearchChange: (value: string) => void;
  onQuickFilterChange: (filter: QuickFilter) => void;
  onAdd: () => void;
  onClearDone: () => void;
  onExport: () => void;
  onActivity: () => void;
};

export function BoardToolbar({
  viewMode,
  searchQuery,
  quickFilter,
  doneCount,
  isManager,
  onViewModeChange,
  onSearchChange,
  onQuickFilterChange,
  onAdd,
  onClearDone,
  onExport,
  onActivity,
}: BoardToolbarProps) {
  return (
    <section className="handover-board-toolbar" aria-label="인수인계 도구">
      <div className="handover-board-toolbar__main">
        <div className="search-box handover-board-toolbar__search">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="객실·내용 검색…"
            autoComplete="off"
            aria-label="객실·내용 검색"
          />
        </div>

        <div className="quick-filters handover-board-toolbar__filters">
          {QUICK_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              data-filter={filter.id}
              onClick={() => onQuickFilterChange(filter.id)}
              className={`quick-filter${quickFilter === filter.id ? ' is-active' : ''}`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="handover-view-toggle" role="tablist" aria-label="인수인계 보기 방식">
          <button
            type="button"
            className={`handover-view-toggle__btn${viewMode === 'board' ? ' is-active' : ''}`}
            onClick={() => onViewModeChange('board')}
          >
            칸반
          </button>
          <button
            type="button"
            className={`handover-view-toggle__btn${viewMode === 'room' ? ' is-active' : ''}`}
            onClick={() => onViewModeChange('room')}
          >
            객실
          </button>
        </div>
      </div>

      <div className="handover-board-toolbar__actions">
        <button type="button" className="btn btn--ghost" onClick={onExport}>
          일일 요약
        </button>
        <button type="button" className="btn btn--ghost" onClick={onActivity}>
          변경 기록
        </button>
        {isManager && doneCount > 0 ? (
          <button type="button" className="btn btn--ghost" onClick={onClearDone}>
            완료 칸 비우기
          </button>
        ) : null}
        <button type="button" className="btn btn--add" onClick={onAdd}>
          <span className="btn__icon" aria-hidden>
            +
          </span>
          <span>새 인수인계</span>
        </button>
      </div>
    </section>
  );
}
