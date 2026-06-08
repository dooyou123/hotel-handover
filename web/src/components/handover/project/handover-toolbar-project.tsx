'use client';

import { QUICK_FILTERS } from '@/lib/handover/constants';
import type { HandoverViewMode, QuickFilter } from '@/lib/handover/types';

type HandoverToolbarProjectProps = {
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
};

export function HandoverToolbarProject(props: HandoverToolbarProjectProps) {
  const {
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
  } = props;

  return (
    <section className="project-handover-toolbar" aria-label="인수인계 도구">
      <div className="project-handover-toolbar__search-wrap">
        <div className="project-handover-toolbar__search">
          <span className="project-handover-toolbar__search-icon" aria-hidden>
            ⌕
          </span>
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
          <p className="project-handover-toolbar__search-hint" role="status">
            검색 결과에 <strong>완료 보관 {archivedSearchCount}건</strong>이 포함되어 있습니다.
          </p>
        ) : null}
      </div>

      <div className="project-handover-toolbar__filters" role="tablist" aria-label="빠른 필터">
        {QUICK_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={quickFilter === filter.id}
            onClick={() => onQuickFilterChange(filter.id)}
            className={`project-handover-toolbar__filter${quickFilter === filter.id ? ' is-active' : ''}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="project-handover-toolbar__command">
        <div className="project-handover-toolbar__view" role="tablist" aria-label="보기 방식">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'today'}
            className={viewMode === 'today' ? 'is-active' : ''}
            onClick={() => onViewModeChange('today')}
          >
            오늘
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'board'}
            className={viewMode === 'board' ? 'is-active' : ''}
            onClick={() => onViewModeChange('board')}
          >
            목록
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'room'}
            className={viewMode === 'room' ? 'is-active' : ''}
            onClick={() => onViewModeChange('room')}
          >
            객실
          </button>
        </div>

        <div className="project-handover-toolbar__actions">
          <button type="button" className="project-handover-toolbar__btn" onClick={onOpenArchive}>
            보관함{archivedCount > 0 ? ` ${archivedCount}` : ''}
          </button>
          {isManager && doneCount > 0 ? (
            <button type="button" className="project-handover-toolbar__btn" onClick={onArchiveDone}>
              완료 비우기
            </button>
          ) : null}
          <button type="button" className="project-handover-toolbar__btn project-handover-toolbar__btn--primary" onClick={onAdd}>
            + 새 인수인계
          </button>
        </div>
      </div>
    </section>
  );
}
