'use client';

import { QUICK_FILTERS } from '@/lib/handover/constants';
import type { HandoverViewMode, QuickFilter } from '@/lib/handover/types';
import { HandoverSearchBar } from './handover-search-bar';

type HandoverToolbarProjectProps = {
  viewMode: HandoverViewMode;
  quickFilter: QuickFilter;
  doneCount: number;
  archivedCount: number;
  archivedSearchCount: number;
  isManager: boolean;
  searchQuery: string;
  searchDateFrom: string;
  searchDateTo: string;
  onViewModeChange: (mode: HandoverViewMode) => void;
  onQuickFilterChange: (filter: QuickFilter) => void;
  onSearchChange: (value: string) => void;
  onSearchDateFromChange: (value: string) => void;
  onSearchDateToChange: (value: string) => void;
  onAdd: () => void;
  onArchiveDone: () => void;
  onOpenArchive: () => void;
};

export function HandoverToolbarProject(props: HandoverToolbarProjectProps) {
  const {
    viewMode,
    quickFilter,
    doneCount,
    archivedCount,
    archivedSearchCount,
    isManager,
    searchQuery,
    searchDateFrom,
    searchDateTo,
    onViewModeChange,
    onQuickFilterChange,
    onSearchChange,
    onSearchDateFromChange,
    onSearchDateToChange,
    onAdd,
    onArchiveDone,
    onOpenArchive,
  } = props;

  return (
    <section className="project-handover-toolbar project-handover-toolbar--main" aria-label="인수인계 도구">
      <div className="project-handover-toolbar__head">
        <h2 className="project-handover-toolbar__title">인수인계장</h2>
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
      </div>

      <div className="project-handover-toolbar__command">
        <div className="project-handover-toolbar__view" role="tablist" aria-label="보기 방식">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'board' || viewMode === 'today'}
            className={viewMode === 'board' || viewMode === 'today' ? 'is-active' : ''}
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

        <div className="project-handover-toolbar__cluster">
          <HandoverSearchBar
            searchQuery={searchQuery}
            searchDateFrom={searchDateFrom}
            searchDateTo={searchDateTo}
            archivedSearchCount={archivedSearchCount}
            onSearchChange={onSearchChange}
            onSearchDateFromChange={onSearchDateFromChange}
            onSearchDateToChange={onSearchDateToChange}
          />
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
      </div>
    </section>
  );
}
