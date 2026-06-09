'use client';

import { useState } from 'react';

type HandoverSearchBarProps = {
  searchQuery: string;
  searchDateFrom: string;
  searchDateTo: string;
  archivedSearchCount: number;
  onSearchChange: (value: string) => void;
  onSearchDateFromChange: (value: string) => void;
  onSearchDateToChange: (value: string) => void;
};

export function HandoverSearchBar({
  searchQuery,
  searchDateFrom,
  searchDateTo,
  archivedSearchCount,
  onSearchChange,
  onSearchDateFromChange,
  onSearchDateToChange,
}: HandoverSearchBarProps) {
  const [datesOpen, setDatesOpen] = useState(Boolean(searchDateFrom || searchDateTo));
  const hasActiveDates = Boolean(searchDateFrom || searchDateTo);

  return (
    <div className="handover-search-bar">
      <div className="handover-search-bar__row">
        <label className="handover-search-bar__input">
          <span className="handover-search-bar__icon" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="객실·제목·댓글·담당자…"
            autoComplete="off"
            aria-label="인수인계 검색"
          />
        </label>
        <button
          type="button"
          className={`handover-search-bar__dates-toggle${datesOpen ? ' is-open' : ''}${hasActiveDates ? ' has-value' : ''}`}
          aria-expanded={datesOpen}
          onClick={() => setDatesOpen((open) => !open)}
        >
          기간{hasActiveDates ? ' ·' : ''}
        </button>
      </div>
      {datesOpen ? (
        <div className="handover-search-bar__dates">
          <label className="handover-search-bar__date-field">
            <span>시작</span>
            <input
              type="date"
              value={searchDateFrom}
              onChange={(event) => onSearchDateFromChange(event.target.value)}
              aria-label="검색 시작일"
            />
          </label>
          <label className="handover-search-bar__date-field">
            <span>종료</span>
            <input
              type="date"
              value={searchDateTo}
              onChange={(event) => onSearchDateToChange(event.target.value)}
              aria-label="검색 종료일"
            />
          </label>
          {hasActiveDates ? (
            <button
              type="button"
              className="handover-search-bar__dates-clear"
              onClick={() => {
                onSearchDateFromChange('');
                onSearchDateToChange('');
              }}
            >
              초기화
            </button>
          ) : null}
        </div>
      ) : null}
      {archivedSearchCount > 0 ? (
        <p className="handover-search-bar__hint" role="status">
          완료 보관 <strong>{archivedSearchCount}건</strong> 포함
        </p>
      ) : null}
    </div>
  );
}
