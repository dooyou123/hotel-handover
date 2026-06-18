'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { getNavPageMeta } from '@/lib/nav/page-meta';
import { invalidateCardQueries } from '@/lib/supabase/handover-realtime';
import { cardSummaryLabel, logActivity } from '@/lib/handover/activity';
import { ComplaintSlaBadge } from '@/components/handover/complaint-sla-badge';
import { formatTime } from '@/lib/handover/card-utils';
import {
  buildFacilitySummaries,
  getOpenFacilityIssues,
  getRoomFacilityIssues,
  mergeFacilityCardSources,
} from '@/lib/facility/facility-stats';
import { useArchivedCards, useCards } from '@/lib/handover/use-cards';
import { useWorkSession } from '@/lib/handover/use-work-session';
import type { Card } from '@/lib/handover/types';
import { createClient } from '@/lib/supabase/client';
import { FacilityResolveModal } from './facility-resolve-modal';

export function FacilityPageClient() {
  const pageMeta = getNavPageMeta('/facility');
  const queryClient = useQueryClient();
  const { cards, updateCard } = useCards();
  const { data: archivedCards = [] } = useArchivedCards();
  const { session, requireSession } = useWorkSession();
  const facilityCards = useMemo(
    () => mergeFacilityCardSources(cards, archivedCards),
    [cards, archivedCards],
  );
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [resolveCard, setResolveCard] = useState<Card | null>(null);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const openIssues = useMemo(() => getOpenFacilityIssues(facilityCards), [facilityCards]);
  const summaries = useMemo(() => buildFacilitySummaries(facilityCards), [facilityCards]);
  const roomIssues = useMemo(
    () => (selectedRoom ? getRoomFacilityIssues(facilityCards, selectedRoom) : []),
    [facilityCards, selectedRoom],
  );

  const frequentRooms = summaries.filter((s) => s.totalCount >= 2).slice(0, 12);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  function audit() {
    return { shift: session.shift, staffName: session.name };
  }

  function openResolve(card: Card) {
    if (!requireSession('시설 이슈 해결')) return;
    setResolveCard(card);
    setResolveOpen(true);
  }

  async function handleResolve(input: { resolution: string; leaveOnHandoverDone: boolean }) {
    if (!resolveCard) return;
    setResolving(true);
    try {
      const resolution = `[시설 해결] ${input.resolution}`;
      await updateCard.mutateAsync({
        id: resolveCard.id,
        input: { column_id: 'done', resolution },
      });

      if (!input.leaveOnHandoverDone) {
        const supabase = createClient();
        const { error } = await supabase
          .from('cards')
          .update({ archived_at: new Date().toISOString() })
          .eq('id', resolveCard.id)
          .eq('hotel_id', DEFAULT_HOTEL_ID);
        if (error) throw error;
      }

      await logActivity({
        entityType: 'card',
        entityId: resolveCard.id,
        action: 'move',
        audit: audit(),
        summary: `시설 해결: ${cardSummaryLabel(resolveCard.room, resolveCard.title)}`,
        details: {
          from: resolveCard.column_id,
          to: 'done',
          leaveOnHandoverDone: input.leaveOnHandoverDone,
        },
      });

      invalidateCardQueries(queryClient);
      showToast(
        input.leaveOnHandoverDone
          ? '해결 완료 — 인수인계 완료 칸에 남겼습니다.'
          : '해결 완료 — 보관함으로 옮겼습니다.',
      );
    } finally {
      setResolving(false);
    }
  }

  return (
    <section className="facility-page">
      <header className="facility-page__header">
        <div>
          <h2>{pageMeta.label}</h2>
          <p>{pageMeta.description}</p>
        </div>
        <div className="facility-page__stats">
          <span>
            미해결 <strong>{openIssues.length}</strong>
          </span>
          <span>
            객실 <strong>{summaries.length}</strong>
          </span>
        </div>
      </header>

      <div className="facility-page__grid">
        <article className="facility-panel">
          <h3>미해결 이슈</h3>
          {!openIssues.length ? (
            <p className="facility-panel__empty">미해결 시설·컴플레인 건이 없습니다.</p>
          ) : (
            <ul className="facility-issue-list">
              {openIssues.map(({ card, issueKind }) => (
                <li key={card.id}>
                  <div className="facility-issue-item-wrap">
                    <button
                      type="button"
                      className="facility-issue-item"
                      onClick={() => setSelectedRoom(card.room.trim() || '(객실 미지정)')}
                    >
                      <span
                        className={`facility-issue-item__kind facility-issue-item__kind--${issueKind === '컴플레인' ? 'complaint' : 'facility'}`}
                      >
                        {issueKind}
                      </span>
                      <strong>{card.room || '—'}</strong>
                      <span>{card.title}</span>
                      <ComplaintSlaBadge card={card} />
                    </button>
                    <button
                      type="button"
                      className="facility-issue-item__resolve"
                      onClick={() => openResolve(card)}
                    >
                      해결
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="facility-panel">
          <h3>객실별 발생 빈도</h3>
          <p className="facility-panel__hint">2회 이상 발생 객실 — 클릭하면 이력 확인</p>
          {!frequentRooms.length ? (
            <p className="facility-panel__empty">반복 이슈 객실이 없습니다.</p>
          ) : (
            <div className="facility-room-grid">
              {frequentRooms.map((summary) => (
                <button
                  key={summary.room}
                  type="button"
                  className={`facility-room-card${selectedRoom === summary.room ? ' is-selected' : ''}`}
                  onClick={() => setSelectedRoom(summary.room)}
                >
                  <strong>{summary.room}</strong>
                  <span>총 {summary.totalCount}건</span>
                  {summary.openCount > 0 ? (
                    <span className="facility-room-card__open">미해결 {summary.openCount}</span>
                  ) : null}
                  <small>
                    시설 {summary.facilityCount} · 컴플레인 {summary.complaintCount}
                  </small>
                </button>
              ))}
            </div>
          )}
        </article>
      </div>

      {selectedRoom ? (
        <article className="facility-panel facility-panel--detail">
          <div className="facility-panel__head">
            <h3>{selectedRoom} 이력</h3>
            <button type="button" className="btn btn--ghost btn--xs" onClick={() => setSelectedRoom(null)}>
              닫기
            </button>
          </div>
          {!roomIssues.length ? (
            <p className="facility-panel__empty">이력이 없습니다.</p>
          ) : (
            <ul className="facility-history">
              {roomIssues.map(({ card, issueKind }) => (
                <li key={card.id} className="facility-history__item">
                  <div className="facility-history__top">
                    <span
                      className={`facility-issue-item__kind facility-issue-item__kind--${issueKind === '컴플레인' ? 'complaint' : 'facility'}`}
                    >
                      {issueKind}
                    </span>
                    <span>
                      {card.archived_at
                        ? '보관'
                        : card.column_id === 'done'
                          ? '완료'
                          : card.column_id === 'hold'
                            ? '보류'
                            : card.column_id === 'progress'
                              ? '진행중'
                              : '긴급'}
                    </span>
                    <time>{formatTime(card.updated_at || card.created_at)}</time>
                    {card.column_id !== 'done' && !card.archived_at ? (
                      <button type="button" className="facility-history__resolve" onClick={() => openResolve(card)}>
                        해결
                      </button>
                    ) : null}
                  </div>
                  <strong>{card.title}</strong>
                  {card.details ? <p>{card.details}</p> : null}
                  {card.resolution ? <p className="facility-history__resolution">처리: {card.resolution}</p> : null}
                  <ComplaintSlaBadge card={card} />
                </li>
              ))}
            </ul>
          )}
        </article>
      ) : null}

      {summaries.length > 0 ? (
        <article className="facility-panel">
          <h3>전체 객실 요약</h3>
          <div className="facility-summary-table-wrap">
            <table className="facility-summary-table">
              <thead>
                <tr>
                  <th>객실</th>
                  <th>총</th>
                  <th>미해결</th>
                  <th>시설</th>
                  <th>컴플레인</th>
                  <th>최근 이슈</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((row) => (
                  <tr
                    key={row.room}
                    onClick={() => setSelectedRoom(row.room)}
                    className="facility-summary-table__row"
                  >
                    <td>
                      <strong>{row.room}</strong>
                    </td>
                    <td>{row.totalCount}</td>
                    <td>{row.openCount || '—'}</td>
                    <td>{row.facilityCount}</td>
                    <td>{row.complaintCount}</td>
                    <td>{row.recentTitles[0] || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ) : null}

      <FacilityResolveModal
        open={resolveOpen}
        card={resolveCard}
        saving={resolving}
        onClose={() => setResolveOpen(false)}
        onSubmit={handleResolve}
      />

      {toast ? <div className="toast toast--project">{toast}</div> : null}
    </section>
  );
}
