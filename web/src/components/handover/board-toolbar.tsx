'use client';

import { CATEGORY_OPTIONS, QUICK_FILTERS } from '@/lib/handover/constants';
import type { HandoverViewMode, QuickFilter } from '@/lib/handover/types';

type BoardToolbarProps = {
  section?: 'header' | 'filters' | 'all';
  viewMode: HandoverViewMode;
  searchQuery: string;
  quickFilter: QuickFilter;
  category: string;
  doneCount: number;
  isManager: boolean;
  onViewModeChange: (mode: HandoverViewMode) => void;
  onSearchChange: (value: string) => void;
  onQuickFilterChange: (filter: QuickFilter) => void;
  onCategoryChange: (value: string) => void;
  onAdd: () => void;
  onClearDone: () => void;
  onExport: () => void;
  onActivity: () => void;
};

export function BoardToolbar({
  section = 'all',
  viewMode,
  searchQuery,
  quickFilter,
  category,
  doneCount,
  isManager,
  onViewModeChange,
  onSearchChange,
  onQuickFilterChange,
  onCategoryChange,
  onAdd,
  onClearDone,
  onExport,
  onActivity,
}: BoardToolbarProps) {
  const showHeader = section === 'all' || section === 'header';
  const showFilters = section === 'all' || section === 'filters';

  return (
    <>
      {showHeader ? (
        <div className="header__actions header__actions--handover" style={{ marginBottom: '1rem', width: '100%' }}>
          <div className="search-box">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="객실·내용 검색…"
              autoComplete="off"
            />
          </div>
          <select
            value={category}
            aria-label="카테고리 필터"
            onChange={(event) => {
              const value = event.target.value;
              onCategoryChange(value);
              if (['VIP', '결제', '민원', '룸이슈', '체크인/아웃'].includes(value)) {
                onQuickFilterChange(value);
              } else if (
                quickFilter !== 'all' &&
                quickFilter !== 'unacked' &&
                quickFilter !== 'mine' &&
                quickFilter !== 'roomclean'
              ) {
                onQuickFilterChange('all');
              }
            }}
          >
            <option value="">전체 카테고리</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
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
      ) : null}

      {showFilters ? (
        <>
          <div className="handover-toolbar">
            <div className="handover-view-toggle">
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
            <p className="handover-toolbar__hint">객실 뷰는 객실번호별로 묶어서 봅니다.</p>
          </div>

          <div className="quick-filters">
            {QUICK_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                data-filter={filter.id}
                onClick={() => {
                  onQuickFilterChange(filter.id);
                  if (
                    filter.id === 'all' ||
                    filter.id === 'unacked' ||
                    filter.id === 'mine' ||
                    filter.id === 'roomclean'
                  ) {
                    onCategoryChange('');
                  } else {
                    onCategoryChange(filter.id);
                  }
                }}
                className={`quick-filter${quickFilter === filter.id ? ' is-active' : ''}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
