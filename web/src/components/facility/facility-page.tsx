'use client';

import { useMemo, useState } from 'react';
import { ComplaintSlaBadge } from '@/components/handover/complaint-sla-badge';
import { formatTime } from '@/lib/handover/card-utils';
import {
  buildFacilitySummaries,
  getOpenFacilityIssues,
  getRoomFacilityIssues,
} from '@/lib/facility/facility-stats';
import { useCards } from '@/lib/handover/use-cards';

export function FacilityPageClient() {
  const { cards } = useCards();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const openIssues = useMemo(() => getOpenFacilityIssues(cards), [cards]);
  const summaries = useMemo(() => buildFacilitySummaries(cards), [cards]);
  const roomIssues = useMemo(
    () => (selectedRoom ? getRoomFacilityIssues(cards, selectedRoom) : []),
    [cards, selectedRoom],
  );

  const frequentRooms = summaries.filter((s) => s.totalCount >= 2).slice(0, 12);

  return (
    <section className="facility-page">
      <header className="facility-page__header">
        <div>
          <h2>시설 문제 현황</h2>
          <p>시설·컴플레인 인수인계 카드 기준 — 최근 90일, 객실별 빈도</p>
        </div>
        <div className="facility-page__stats">
          <span>미해결 <strong>{openIssues.length}</strong></span>
          <span>객실 <strong>{summaries.length}</strong></span>
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
                  <button
                    type="button"
                    className="facility-issue-item"
                    onClick={() => setSelectedRoom(card.room.trim() || '(객실 미지정)')}
                  >
                    <span className={`facility-issue-item__kind facility-issue-item__kind--${issueKind === '컴플레인' ? 'complaint' : 'facility'}`}>
                      {issueKind}
                    </span>
                    <strong>{card.room || '—'}</strong>
                    <span>{card.title}</span>
                    <ComplaintSlaBadge card={card} />
                  </button>
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
                  <small>시설 {summary.facilityCount} · 컴플레인 {summary.complaintCount}</small>
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
                    <span className={`facility-issue-item__kind facility-issue-item__kind--${issueKind === '컴플레인' ? 'complaint' : 'facility'}`}>
                      {issueKind}
                    </span>
                    <span>{card.column_id === 'done' ? '완료' : card.column_id === 'progress' ? '진행중' : '긴급'}</span>
                    <time>{formatTime(card.updated_at || card.created_at)}</time>
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
                  <tr key={row.room} onClick={() => setSelectedRoom(row.room)} className="facility-summary-table__row">
                    <td><strong>{row.room}</strong></td>
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
    </section>
  );
}
