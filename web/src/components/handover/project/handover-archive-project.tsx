'use client';

import { useMemo, useState } from 'react';
import { filterCards } from '@/lib/handover/card-utils';
import type { Card, WorkSession } from '@/lib/handover/types';
import { HandoverListRowProject } from './handover-list-row-project';
import { HandoverStatusTabs, type HandoverStatusTab } from './handover-status-tabs';

type HandoverArchiveProjectProps = {
  cards: Card[];
  isLoading: boolean;
  isManager: boolean;
  searchQuery: string;
  searchDateFrom: string;
  searchDateTo: string;
  session: WorkSession;
  statusCounts: Record<HandoverStatusTab, number>;
  onStatusTabChange: (tab: HandoverStatusTab) => void;
  onOpenCard: (card: Card) => void;
  onRestore?: (cardId: string) => Promise<void>;
};

type ArchiveSort =
  | 'archived-desc'
  | 'archived-asc'
  | 'created-desc'
  | 'created-asc'
  | 'number-desc'
  | 'number-asc';

const ARCHIVE_SORT_OPTIONS: { value: ArchiveSort; label: string }[] = [
  { value: 'archived-desc', label: '최근 보관순' },
  { value: 'archived-asc', label: '오래된 보관순' },
  { value: 'created-desc', label: '등록 최신순' },
  { value: 'created-asc', label: '등록 오래된순' },
  { value: 'number-desc', label: '번호 큰순' },
  { value: 'number-asc', label: '번호 작은순' },
];

function timestamp(value: string | null): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortArchivedCards(cards: Card[], sort: ArchiveSort): Card[] {
  return [...cards].sort((a, b) => {
    if (sort === 'archived-desc') return timestamp(b.archived_at) - timestamp(a.archived_at);
    if (sort === 'archived-asc') return timestamp(a.archived_at) - timestamp(b.archived_at);
    if (sort === 'created-desc') return timestamp(b.created_at) - timestamp(a.created_at);
    if (sort === 'created-asc') return timestamp(a.created_at) - timestamp(b.created_at);
    if (sort === 'number-desc') return (b.handover_no ?? -1) - (a.handover_no ?? -1);
    return (a.handover_no ?? Number.MAX_SAFE_INTEGER) - (b.handover_no ?? Number.MAX_SAFE_INTEGER);
  });
}

const noop = () => undefined;

export function HandoverArchiveProject({
  cards,
  isLoading,
  isManager,
  searchQuery,
  searchDateFrom,
  searchDateTo,
  session,
  statusCounts,
  onStatusTabChange,
  onOpenCard,
  onRestore,
}: HandoverArchiveProjectProps) {
  const [sort, setSort] = useState<ArchiveSort>('archived-desc');
  const filtered = useMemo(
    () =>
      filterCards(cards, {
        query: searchQuery,
        quickFilter: 'all',
        category: '',
        session,
        dateFrom: searchDateFrom || null,
        dateTo: searchDateTo || null,
      }),
    [cards, searchQuery, searchDateFrom, searchDateTo, session],
  );

  const sortedCards = useMemo(() => sortArchivedCards(filtered, sort), [filtered, sort]);

  const statusTabs = (
    <HandoverStatusTabs
      active="archive"
      counts={statusCounts}
      onChange={onStatusTabChange}
      actions={
        cards.length ? (
          <>
            <span className="project-list__total" aria-live="polite">
              {filtered.length === cards.length
                ? `총 ${cards.length}건`
                : `전체 ${cards.length}건 중 ${filtered.length}건`}
            </span>
            <label className="project-list__sort">
              <span>정렬</span>
              <select
                value={sort}
                aria-label="보관함 정렬"
                onChange={(event) => setSort(event.target.value as ArchiveSort)}
              >
                {ARCHIVE_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null
      }
    />
  );

  if (isLoading) {
    return (
      <div className="project-archive">
        {statusTabs}
        <p className="project-archive__status">보관함을 불러오는 중…</p>
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div className="project-archive">
        {statusTabs}
        <div className="project-archive__empty">
          <p className="project-archive__empty-title">보관된 완료 인수인계가 없습니다</p>
          <p className="project-archive__empty-lead">
            「완료 비우기」로 옮긴 카드가 여기에 남습니다. 삭제되지 않으며 검색·복원할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="project-archive">
        {statusTabs}
        <div className="project-archive__empty">
          <p className="project-archive__empty-title">검색 결과가 없습니다</p>
          <p className="project-archive__empty-lead">검색어나 기간 필터를 바꿔 보세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="project-archive">
      {statusTabs}
      <div className="project-list project-archive__list">
        <div className="project-list__rows">
          {sortedCards.map((card) => (
            <HandoverListRowProject
              key={card.id}
              card={card}
              searchQuery={searchQuery}
              staffNames={[]}
              onOpen={() => onOpenCard(card)}
              onOpenComments={() => onOpenCard(card)}
              staffName={session.name}
              onAcknowledge={noop}
              onMarkDone={noop}
              onHold={noop}
              onResume={noop}
              onAssignChange={noop}
              onRestore={isManager && onRestore ? () => void onRestore(card.id) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
