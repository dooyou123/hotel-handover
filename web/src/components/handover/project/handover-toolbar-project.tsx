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
  } = props;

  const isArchiveView = viewMode === 'archive';
  const isBriefView = viewMode === 'brief';
  const isListView = !isArchiveView && !isBriefView && viewMode !== 'room';

  return (
    <section className="project-handover-toolbar project-handover-toolbar--main" aria-label="인수인계 도구">
      <div className="project-handover-toolbar__row project-handover-toolbar__row--primary">
        <h2 className="project-handover-toolbar__title">인수인계장</h2>

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
          <button
            type="button"
            role="tab"
            aria-selected={isBriefView}
            className={isBriefView ? 'is-active' : ''}
            onClick={() => onViewModeChange('brief')}
          >
            인계
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isArchiveView}
            className={isArchiveView ? 'is-active' : ''}
            onClick={() => onViewModeChange('archive')}
          >
            보관함{archivedCount > 0 ? ` ${archivedCount}` : ''}
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
            {isManager && doneCount > 0 ? (
              <button type="button" className="project-handover-toolbar__btn" onClick={onArchiveDone}>
                완료 비우기
              </button>
            ) : null}
            <button
              type="button"
              className="project-handover-toolbar__btn project-handover-toolbar__btn--primary"
              onClick={onAdd}
            >
              + 새 인수인계
            </button>
          </div>
        </div>
      </div>

      {isListView ? (
      <div className="project-handover-toolbar__row project-handover-toolbar__row--filters">
        <div className="project-handover-toolbar__filters" role="tablist" aria-label="빠른 필터">
          {QUICK_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={quickFilter === filter.id}
              onClick={() => onQuickFilterChange(filter.id)}
              className={[
                'project-handover-toolbar__filter',
                quickFilter === filter.id ? 'is-active' : '',
                filter.id === 'unacked' ? 'project-handover-toolbar__filter--warn' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      ) : isBriefView ? (
        <p className="project-handover-toolbar__archive-hint">
          교대 인수 전 확인 화면입니다. 위 숫자 칩으로 한눈에 보고, 항목을 누르면 카드 상세로 이동합니다.
        </p>
      ) : (
        <p className="project-handover-toolbar__archive-hint">
          완료 비우기로 옮긴 카드입니다. 검색·기간 필터로 찾을 수 있고, 관리자는 완료 칸으로 복원할 수 있습니다.
          {archivedSearchCount > 0 && searchQuery.trim()
            ? ` · 목록 검색에도 맞는 보관 ${archivedSearchCount}건`
            : ''}
        </p>
      )}
    </section>
  );
}
