'use client';

import { QUICK_FILTERS } from '@/lib/handover/constants';
import type { HandoverViewMode, QuickFilter } from '@/lib/handover/types';

type BoardToolbarProps = {
  viewMode: HandoverViewMode;
  searchQuery: string;
  quickFilter: QuickFilter;
  doneCount: number;
  archivedCount: number;
  archivedSearchCount: number;
  isManager: boolean;
  onViewModeChange: (mode: HandoverViewMode) => void;
  onSearchChange: (value: string) => void;
  onQuickFilterChange: (filter: QuickFilter) => void;
  onAdd: () => void;
  onArchiveDone: () => void;
  onOpenArchive: () => void;
  onExport: () => void;
  onActivity: () => void;
  onOpenShiftBrief?: () => void;
  onShiftStart?: () => void;
  onShiftEnd?: () => void;
};

export function BoardToolbar({
  viewMode,
  searchQuery,
  quickFilter,
  doneCount,
  archivedCount,
  archivedSearchCount,
  isManager,
  onViewModeChange,
  onSearchChange,
  onQuickFilterChange,
  onAdd,
  onArchiveDone,
  onOpenArchive,
  onExport,
  onActivity,
  onOpenShiftBrief,
  onShiftStart,
  onShiftEnd,
}: BoardToolbarProps) {
  return (
    <section className="handover-board-toolbar" aria-label="인수인계 도구">
      <div className="handover-board-toolbar__search-wrap">
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
        {archivedSearchCount > 0 ? (
          <p className="handover-board-toolbar__search-hint" role="status">
            검색 결과에 <strong>완료 보관 {archivedSearchCount}건</strong>이 포함되어 있습니다.
          </p>
        ) : null}
      </div>

      <div className="handover-board-toolbar__filters-row">
        <div
          className="segmented-control handover-board-toolbar__filters"
          role="tablist"
          aria-label="빠른 필터"
        >
          {QUICK_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              data-filter={filter.id}
              role="tab"
              aria-selected={quickFilter === filter.id}
              onClick={() => onQuickFilterChange(filter.id)}
              className={`segmented-control__btn${quickFilter === filter.id ? ' is-active' : ''}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="handover-board-toolbar__actions-row">
        <div
          className="segmented-control segmented-control--compact handover-board-toolbar__view"
          role="tablist"
          aria-label="보기 방식"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'board'}
            className={`segmented-control__btn${viewMode === 'board' ? ' is-active' : ''}`}
            onClick={() => onViewModeChange('board')}
          >
            칸반
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'room'}
            className={`segmented-control__btn${viewMode === 'room' ? ' is-active' : ''}`}
            onClick={() => onViewModeChange('room')}
          >
            객실
          </button>
        </div>

        <div className="handover-board-toolbar__actions">
            {onShiftStart ? (
              <button type="button" className="btn btn--outline btn--small" onClick={onShiftStart}>
                교대 시작
              </button>
            ) : null}
            {onShiftEnd ? (
              <button type="button" className="btn btn--outline btn--small" onClick={onShiftEnd}>
                교대 종료
              </button>
            ) : null}
            {onOpenShiftBrief ? (
              <button type="button" className="btn btn--primary btn--small" onClick={onOpenShiftBrief}>
                교대 인계 화면
              </button>
            ) : null}
            <button type="button" className="btn btn--outline btn--small" onClick={onExport}>
              일일 요약
            </button>
            <button type="button" className="btn btn--outline btn--small" onClick={onActivity}>
              변경 기록
            </button>
            <button type="button" className="btn btn--outline btn--small" onClick={onOpenArchive}>
              보관함{archivedCount > 0 ? ` ${archivedCount}` : ''}
            </button>
            {isManager && doneCount > 0 ? (
              <button type="button" className="btn btn--outline btn--small" onClick={onArchiveDone}>
                완료 비우기
              </button>
            ) : null}
            <button type="button" className="btn btn--primary btn--small" onClick={onAdd}>
              + 새 인수인계
            </button>
        </div>
      </div>
    </section>
  );
}
