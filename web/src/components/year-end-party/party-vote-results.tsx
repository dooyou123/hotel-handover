'use client';

import {
  buildVoterBallotSummaries,
  venueRankBreakdown,
  venueScore,
  venueVoteCount,
} from '@/lib/year-end-party/helpers';
import {
  PARTY_RANKS,
  PARTY_VETO_META,
  type PartyVenue,
  type PartyVenueVote,
  type PartyDateVote,
  type PartyEmployee,
} from '@/lib/year-end-party/types';

type PartyVoteResultsProps = {
  employees: PartyEmployee[];
  venues: PartyVenue[];
  venueVotes: PartyVenueVote[];
  dateVotes: PartyDateVote[];
  /** false면 누가·어디에 찍었는지 숨기고 진행 현황만 표시 */
  published: boolean;
  votingClosed?: boolean;
  onRevote?: (voterName: string) => void;
};

function initialOf(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 1) : '?';
}

export function PartyVoteResults({
  employees,
  venues,
  venueVotes,
  dateVotes,
  published,
  votingClosed = false,
  onRevote,
}: PartyVoteResultsProps) {
  const { voted, pending, venueNeverPicked } = buildVoterBallotSummaries({
    employees,
    venues,
    venueVotes,
    dateVotes,
  });

  const total = voted.length + pending.length;
  const progressPct = total > 0 ? Math.round((voted.length / total) * 100) : 0;

  const rankedVenues = [...venues]
    .map((venue) => {
      const votes = venueVotes.filter((v) => v.venue_id === venue.id);
      return {
        venue,
        score: venueScore(votes),
        count: venueVoteCount(votes),
        breakdown: venueRankBreakdown(votes),
      };
    })
    .sort((a, b) => b.score - a.score || b.count - a.count);

  return (
    <section className="yp-home-section yp-results">
      <div className="yp-home-section__head">
        <div>
          <h2>{published ? '투표 결과' : '투표 현황'}</h2>
          <p className="yp-muted">
            {published
              ? '누가 몇 순위로 골랐는지, 아직 안 한 사람, 한 표도 없는 장소를 한눈에 봅니다.'
              : '투표한 사람·아직 안 한 사람은 보이지만, 어디에 찍었는지는 결과 공개 후에만 보입니다.'}
          </p>
        </div>
        <span className="yp-results__meta">
          완료 {voted.length} · 미투표 {pending.length}
          {published ? '' : ' · 🔒 선택 비공개'}
        </span>
      </div>

      <div className="yp-progress-board">
        <div className="yp-progress-board__bar-wrap" aria-hidden="true">
          <div className="yp-progress-board__bar" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="yp-progress-board__summary">
          참석 {total}명 중 <strong>{voted.length}명</strong> 투표 완료
          {total > 0 ? ` · ${progressPct}%` : ''}
        </p>

        <div className="yp-progress-board__cols">
          <div className="yp-progress-col yp-progress-col--done">
            <header className="yp-progress-col__head">
              <h3>투표 완료</h3>
              <span className="yp-progress-col__count">{voted.length}</span>
            </header>
            {voted.length ? (
              <ul className="yp-progress-people">
                {voted.map((row) => (
                  <li key={row.voter_name} className="yp-progress-person yp-progress-person--done">
                    <span className="yp-progress-person__avatar" aria-hidden="true">
                      {initialOf(row.voter_name)}
                    </span>
                    <span className="yp-progress-person__name">{row.voter_name}</span>
                    {onRevote && !votingClosed ? (
                      <div className="yp-progress-person__actions">
                        <button
                          type="button"
                          className="yp-progress-person__action"
                          onClick={() => onRevote(row.voter_name)}
                        >
                          재투표
                        </button>
                      </div>
                    ) : (
                      <span className="yp-progress-person__badge">완료</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="yp-progress-col__empty">아직 제출한 사람이 없습니다.</p>
            )}
          </div>

          <div className="yp-progress-col yp-progress-col--pending">
            <header className="yp-progress-col__head">
              <h3>아직 안 함</h3>
              <span className="yp-progress-col__count">{pending.length}</span>
            </header>
            {pending.length ? (
              <ul className="yp-progress-people">
                {pending.map((row) => (
                  <li key={row.id} className="yp-progress-person yp-progress-person--pending">
                    <span className="yp-progress-person__avatar" aria-hidden="true">
                      {initialOf(row.name)}
                    </span>
                    <div className="yp-progress-person__text">
                      <span className="yp-progress-person__name">{row.name}</span>
                      {row.department ? (
                        <span className="yp-progress-person__dept">{row.department}</span>
                      ) : null}
                    </div>
                    {onRevote && !votingClosed ? (
                      <button
                        type="button"
                        className="yp-progress-person__action yp-progress-person__action--pending"
                        onClick={() => onRevote(row.name)}
                      >
                        투표
                      </button>
                    ) : (
                      <span className="yp-progress-person__badge">대기</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="yp-progress-col__empty yp-progress-col__empty--success">
                참석 예정 직원이 모두 투표했습니다.
              </p>
            )}
          </div>
        </div>

        {!published ? (
          <p className="yp-progress-board__sealed">
            장소 점수·순위·직원별 선택은 잠겨 있습니다. 준비 → 투표 기간에서 「결과 공개」를 누르면
            전체가 볼 수 있습니다.
          </p>
        ) : null}
      </div>

      {published ? (
        <div className="yp-results__grid">
          <article className="yp-card yp-results__card">
            <h3>장소 순위 (점수)</h3>
            {rankedVenues.length ? (
              <ol className="yp-results__venue-list">
                {rankedVenues.map((row, index) => (
                  <li key={row.venue.id}>
                    <div className="yp-results__venue-top">
                      <strong>
                        {index + 1}. {row.venue.name}
                      </strong>
                      <span>
                        {row.score}점 · {row.count}표
                      </span>
                    </div>
                    <p className="yp-muted">
                      {PARTY_RANKS[1].emoji} {row.breakdown[1].join(', ') || '—'}
                      {' · '}
                      {PARTY_RANKS[2].emoji} {row.breakdown[2].join(', ') || '—'}
                      {' · '}
                      {PARTY_RANKS[3].emoji} {row.breakdown[3].join(', ') || '—'}
                    </p>
                    {row.breakdown.veto.length ? (
                      <p className="yp-results__veto">
                        {PARTY_VETO_META.emoji} {row.breakdown.veto.join(', ')}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="yp-muted">등록된 장소가 없습니다.</p>
            )}
            {venueNeverPicked.length ? (
              <p className="yp-results__never">
                표 없음: {venueNeverPicked.map((v) => v.name).join(', ')}
              </p>
            ) : null}
          </article>

          <article className="yp-card yp-results__card">
            <h3>직원별 선택 내용</h3>
            {voted.length ? (
              <div className="yp-results__table-wrap">
                <table className="yp-results__table">
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>1순위</th>
                      <th>2순위</th>
                      <th>3순위</th>
                      <th>{PARTY_VETO_META.emoji} 싫어요</th>
                      <th>일정</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voted.map((row) => (
                      <tr key={row.voter_name}>
                        <td>{row.voter_name}</td>
                        <td>{row.venueNames[1] ?? '—'}</td>
                        <td>{row.venueNames[2] ?? '—'}</td>
                        <td>{row.venueNames[3] ?? '—'}</td>
                        <td>{row.vetoVenueName ?? '—'}</td>
                        <td>{row.dateVoteCount ? `${row.dateVoteCount}건` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="yp-muted">아직 제출된 순위 투표가 없습니다.</p>
            )}
          </article>
        </div>
      ) : null}
    </section>
  );
}
