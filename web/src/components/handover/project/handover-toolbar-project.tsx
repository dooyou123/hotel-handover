'use client';

import { useEffect, useRef, useState } from 'react';
import type { HandoverViewMode } from '@/lib/handover/types';
import { HandoverSearchBar } from './handover-search-bar';

type HandoverToolbarProjectProps = {
  viewMode: HandoverViewMode;
  doneCount: number;
  archivedSearchCount: number;
  isManager: boolean;
  searchQuery: string;
  searchDateFrom: string;
  searchDateTo: string;
  onViewModeChange: (mode: HandoverViewMode) => void;
  onSearchChange: (value: string) => void;
  onSearchDateFromChange: (value: string) => void;
  onSearchDateToChange: (value: string) => void;
  onAdd: () => void;
  onArchiveDone: () => void;
};

export function HandoverToolbarProject({
  viewMode,
  doneCount,
  archivedSearchCount,
  isManager,
  searchQuery,
  searchDateFrom,
  searchDateTo,
  onViewModeChange,
  onSearchChange,
  onSearchDateFromChange,
  onSearchDateToChange,
  onAdd,
  onArchiveDone,
}: HandoverToolbarProjectProps) {
  const isArchiveView = viewMode === 'archive';
  const isBriefView = viewMode === 'brief';
  const isBoardView = viewMode === 'board';
  const canArchiveDone = isManager && doneCount > 0;
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMoreOpen(false);
    }
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [moreOpen]);

  return (
    <section className="project-handover-toolbar project-handover-toolbar--main" aria-label="인수인계 도구">
      <div className="project-handover-toolbar__top">
        <div className="project-handover-toolbar__brand">
          <h2 className="project-handover-toolbar__title">인수인계장</h2>
          <div className="project-handover-toolbar__view" role="tablist" aria-label="보기 방식">
            <button
              type="button"
              role="tab"
              aria-selected={isBoardView || isArchiveView}
              className={isBoardView || isArchiveView ? 'is-active' : ''}
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
          </div>
        </div>

        <div className="project-handover-toolbar__tools">
          <HandoverSearchBar
            searchQuery={searchQuery}
            searchDateFrom={searchDateFrom}
            searchDateTo={searchDateTo}
            archivedSearchCount={archivedSearchCount}
            onSearchChange={onSearchChange}
            onSearchDateFromChange={onSearchDateFromChange}
            onSearchDateToChange={onSearchDateToChange}
          />
          {canArchiveDone ? (
            <button
              type="button"
              className="project-handover-toolbar__btn project-handover-toolbar__btn--archive-desktop"
              onClick={onArchiveDone}
            >
              완료 비우기
            </button>
          ) : null}
          {canArchiveDone ? (
            <div className="project-handover-toolbar__more" ref={moreRef}>
              <button
                type="button"
                className="project-handover-toolbar__btn project-handover-toolbar__btn--icon project-handover-toolbar__btn--more"
                aria-label="더 보기"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((open) => !open)}
              >
                ···
              </button>
              {moreOpen ? (
                <div className="project-handover-toolbar__more-panel" role="menu">
                  <button
                    type="button"
                    className="project-handover-toolbar__more-item"
                    role="menuitem"
                    onClick={() => {
                      setMoreOpen(false);
                      onArchiveDone();
                    }}
                  >
                    완료 비우기
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            className="project-handover-toolbar__btn project-handover-toolbar__btn--primary project-handover-toolbar__btn--add-inline"
            onClick={onAdd}
          >
            <span className="project-handover-toolbar__add-full">+ 새 인수인계</span>
            <span className="project-handover-toolbar__add-short" aria-hidden>
              +
            </span>
          </button>
        </div>
      </div>

      {isBriefView ? (
        <p className="project-handover-toolbar__hint">
          교대 인수 전 확인 화면입니다. 항목을 누르면 카드 상세로 이동합니다.
        </p>
      ) : isArchiveView ? (
        <p className="project-handover-toolbar__hint">
          완료 후 약 24시간이 지나면 자동 보관됩니다. 검색·기간으로 찾을 수 있습니다.
          {archivedSearchCount > 0 && searchQuery.trim()
            ? ` · 목록 검색에도 맞는 보관 ${archivedSearchCount}건`
            : ''}
        </p>
      ) : null}
    </section>
  );
}
