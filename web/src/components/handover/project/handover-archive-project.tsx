'use client';

import { useMemo, useState } from 'react';
import { filterCards } from '@/lib/handover/card-utils';
import type { Card, WorkSession } from '@/lib/handover/types';
import { HandoverListRowProject } from './handover-list-row-project';
import { HandoverStatusTabs, type HandoverStatusTab } from './handover-status-tabs';

type HandoverArchiveProjectProps = {
  cards: Card[];
  isLoading: boolean;
  /** 보관함 전체 건수 (불러온 것과 무관하게 DB 기준) */
  totalCount: number;
  /** 아직 불러오지 않은 이전 기록이 있는지 */
  hasMore: boolean;
  onLoadMore: () => void;
  onLoadAll: () => void;
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

type MonthGroup = { key: string; label: string; cards: Card[] };

function monthKey(value: string | null): string {
  if (!value) return 'unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  if (key === 'unknown') return '날짜 미상';
  const [year, month] = key.split('-');
  return `${year}년 ${Number(month)}월`;
}

/** 정렬 순서를 유지한 채 월 단위로 묶는다 (번호 정렬은 월 그룹이 무의미하므로 제외) */
function groupCardsByMonth(cards: Card[], sort: ArchiveSort): MonthGroup[] | null {
  if (sort === 'number-desc' || sort === 'number-asc') return null;
  const field: 'archived_at' | 'created_at' =
    sort === 'created-desc' || sort === 'created-asc' ? 'created_at' : 'archived_at';

  const groups: MonthGroup[] = [];
  const index = new Map<string, MonthGroup>();
  for (const card of cards) {
    const key = monthKey(card[field]);
    let group = index.get(key);
    if (!group) {
      group = { key, label: monthLabel(key), cards: [] };
      index.set(key, group);
      groups.push(group);
    }
    group.cards.push(card);
  }
  return groups;
}

const noop = () => undefined;

export function HandoverArchiveProject({
  cards,
  isLoading,
  totalCount,
  hasMore,
  onLoadMore,
  onLoadAll,
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
  // 기본은 모두 접힘 — 펼친 달만 기억한다
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const searchActive = Boolean(searchQuery.trim() || searchDateFrom || searchDateTo);

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
  const monthGroups = useMemo(() => groupCardsByMonth(sortedCards, sort), [sortedCards, sort]);

  function toggleMonth(key: string) {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const statusTabs = (
    <HandoverStatusTabs
      active="archive"
      counts={statusCounts}
      onChange={onStatusTabChange}
      actions={
        cards.length ? (
          <>
            <span className="project-list__total" aria-live="polite">
              {searchActive
                ? `검색 결과 ${filtered.length}건`
                : hasMore
                  ? `최근 ${cards.length}건 / 전체 ${totalCount}건`
                  : `총 ${cards.length}건`}
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

  // 더 오래된 기록이 남아 있을 때만 노출 — 검색 중에는 전체를 서버에서 검색하므로 불필요
  const loadMoreFooter =
    !searchActive && hasMore ? (
      <div className="project-archive__more">
        <button type="button" className="btn btn--ghost" onClick={onLoadMore}>
          이전 기록 더 보기
        </button>
        <button type="button" className="project-archive__more-all" onClick={onLoadAll}>
          전체 {totalCount}건 모두 불러오기
        </button>
      </div>
    ) : null;

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
          {totalCount > 0 && !searchActive ? (
            <>
              <p className="project-archive__empty-title">최근 기간에 보관된 기록이 없습니다</p>
              <p className="project-archive__empty-lead">
                이전 기록 {totalCount}건이 보관되어 있습니다. 아래 버튼으로 불러오거나 검색해 보세요.
              </p>
              <div className="project-archive__more">
                <button type="button" className="btn btn--ghost" onClick={onLoadMore}>
                  이전 기록 더 보기
                </button>
                <button type="button" className="project-archive__more-all" onClick={onLoadAll}>
                  전체 {totalCount}건 모두 불러오기
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="project-archive__empty-title">보관된 완료 인수인계가 없습니다</p>
              <p className="project-archive__empty-lead">
                「완료 비우기」로 옮긴 카드가 여기에 남습니다. 삭제되지 않으며 검색·복원할 수 있습니다.
              </p>
            </>
          )}
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

  const renderRow = (card: Card) => (
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
  );

  return (
    <div className="project-archive">
      {statusTabs}
      <div className="project-list project-archive__list">
        {monthGroups ? (
          monthGroups.map((group) => {
            // 검색 중에는 결과가 가려지지 않도록 모두 펼친다
            const isCollapsed = searchActive ? false : !expandedMonths.has(group.key);
            return (
              <section key={group.key} className="project-archive__month">
                <button
                  type="button"
                  className="project-archive__month-head"
                  aria-expanded={!isCollapsed}
                  onClick={() => toggleMonth(group.key)}
                >
                  <span className={`project-archive__month-chevron${isCollapsed ? ' is-collapsed' : ''}`} aria-hidden>
                    ▾
                  </span>
                  <span className="project-archive__month-label">{group.label}</span>
                  <span className="project-archive__month-count">{group.cards.length}건</span>
                </button>
                {!isCollapsed ? <div className="project-list__rows">{group.cards.map(renderRow)}</div> : null}
              </section>
            );
          })
        ) : (
          <div className="project-list__rows">{sortedCards.map(renderRow)}</div>
        )}
      </div>
      {loadMoreFooter}
    </div>
  );
}
