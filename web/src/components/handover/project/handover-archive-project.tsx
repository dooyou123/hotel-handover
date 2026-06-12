'use client';

import { useMemo } from 'react';
import { PRIORITY_LABELS } from '@/lib/handover/constants';
import {
  filterCards,
  formatArchiveTime,
  formatAssigneeLabel,
  formatTime,
} from '@/lib/handover/card-utils';
import type { Card, WorkSession } from '@/lib/handover/types';
import { SearchHighlight } from '@/components/handover/search-highlight';

type HandoverArchiveProjectProps = {
  cards: Card[];
  isLoading: boolean;
  isManager: boolean;
  searchQuery: string;
  searchDateFrom: string;
  searchDateTo: string;
  session: WorkSession;
  onOpenCard: (card: Card) => void;
  onRestore?: (cardId: string) => Promise<void>;
};

type ArchiveGroup = {
  id: string;
  label: string;
  cards: Card[];
};

function groupArchivedCards(cards: Card[]): ArchiveGroup[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  const buckets: ArchiveGroup[] = [
    { id: 'today', label: '오늘 보관', cards: [] },
    { id: 'yesterday', label: '어제 보관', cards: [] },
    { id: 'week', label: '최근 7일', cards: [] },
    { id: 'older', label: '이전', cards: [] },
  ];

  const sorted = [...cards].sort(
    (a, b) => new Date(b.archived_at ?? 0).getTime() - new Date(a.archived_at ?? 0).getTime(),
  );

  for (const card of sorted) {
    const archivedAt = card.archived_at ? new Date(card.archived_at) : null;
    if (!archivedAt || Number.isNaN(archivedAt.getTime())) {
      buckets[3]?.cards.push(card);
      continue;
    }
    if (archivedAt >= startOfToday) {
      buckets[0]?.cards.push(card);
    } else if (archivedAt >= startOfYesterday) {
      buckets[1]?.cards.push(card);
    } else if (archivedAt >= startOfWeek) {
      buckets[2]?.cards.push(card);
    } else {
      buckets[3]?.cards.push(card);
    }
  }

  return buckets.filter((group) => group.cards.length > 0);
}

export function HandoverArchiveProject({
  cards,
  isLoading,
  isManager,
  searchQuery,
  searchDateFrom,
  searchDateTo,
  session,
  onOpenCard,
  onRestore,
}: HandoverArchiveProjectProps) {
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

  const groups = useMemo(() => groupArchivedCards(filtered), [filtered]);

  if (isLoading) {
    return <p className="project-archive__status">보관함을 불러오는 중…</p>;
  }

  if (!cards.length) {
    return (
      <div className="project-archive__empty">
        <p className="project-archive__empty-title">보관된 완료 인수인계가 없습니다</p>
        <p className="project-archive__empty-lead">
          「완료 비우기」로 옮긴 카드가 여기에 남습니다. 삭제되지 않으며 검색·복원할 수 있습니다.
        </p>
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="project-archive__empty">
        <p className="project-archive__empty-title">검색 결과가 없습니다</p>
        <p className="project-archive__empty-lead">검색어나 기간 필터를 바꿔 보세요.</p>
      </div>
    );
  }

  return (
    <div className="project-archive">
      <header className="project-archive__head">
        <div>
          <h3 className="project-archive__title">완료 보관함</h3>
          <p className="project-archive__lead">
            완료 비우기로 보관된 인수인계 {cards.length}건
            {searchQuery.trim() || searchDateFrom || searchDateTo
              ? ` · 표시 ${filtered.length}건`
              : ''}
          </p>
        </div>
      </header>

      <div className="project-list project-archive__list">
        {groups.map((group) => (
          <section key={group.id} className="project-list__section">
            <header className="project-list__head">
              <h3>{group.label}</h3>
              <span className="project-list__count">{group.cards.length}</span>
            </header>
            <div className="project-list__rows">
              {group.cards.map((card) => {
                const assignee = formatAssigneeLabel(card);
                const resolution = card.resolution?.trim() || card.details?.trim() || '';
                return (
                  <article key={card.id} className="project-list-row is-archived is-done">
                    <div className="project-list-row__body">
                      <button
                        type="button"
                        className="project-list-row__main"
                        onClick={() => onOpenCard(card)}
                      >
                        <div className="project-list-row__top">
                          <span className="project-list-row__status project-list-row__status--archive">
                            보관
                          </span>
                          {card.room ? (
                            <span className="project-list-row__room" title={card.room}>
                              <SearchHighlight text={card.room} query={searchQuery} />
                            </span>
                          ) : null}
                          <span className="project-list-row__meta">
                            <span className="project-list-row__badge">
                              {PRIORITY_LABELS[card.priority]}
                            </span>
                            <span className="project-list-row__badge">{card.category}</span>
                          </span>
                        </div>

                        <span className="project-list-row__title" title={card.title}>
                          <SearchHighlight text={card.title} query={searchQuery} />
                        </span>

                        {resolution ? (
                          <span className="project-list-row__preview" title={resolution}>
                            <SearchHighlight text={resolution} query={searchQuery} />
                          </span>
                        ) : null}

                        <span className="project-list-row__foot">
                          <span className="project-list-row__people">
                            <span>{card.author?.trim() || '미입력'}</span>
                            {assignee ? (
                              <>
                                <span className="project-list-row__foot-sep">·</span>
                                <span>담당 {assignee}</span>
                              </>
                            ) : null}
                          </span>
                          <span className="project-archive-row__times">
                            {card.archived_at ? (
                              <time dateTime={card.archived_at} title="보관 시각">
                                보관 {formatArchiveTime(card.archived_at)}
                              </time>
                            ) : null}
                            <time
                              dateTime={card.updated_at || card.created_at}
                              title="완료 시각"
                            >
                              완료 {formatTime(card.updated_at || card.created_at)}
                            </time>
                          </span>
                        </span>
                      </button>
                    </div>
                    {isManager && onRestore ? (
                      <div className="project-list-row__actions">
                        <button
                          type="button"
                          className="project-list-row__restore"
                          onClick={() => onRestore(card.id)}
                        >
                          복원
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
