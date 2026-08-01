'use client';

import { useMemo, useState } from 'react';
import { sortThreadCards, suggestThreadCandidates } from '@/lib/handover/card-thread';
import { COLUMN_LABELS } from '@/lib/handover/constants';
import { isArchivedCard } from '@/lib/handover/card-utils';
import { useCardThread } from '@/lib/handover/use-cards';
import type { Card } from '@/lib/handover/types';

type CardThreadSectionProps = {
  card: Card;
  activeCards: Card[];
  onOpenCardById?: (cardId: string) => void;
  onLink?: (target: Card) => Promise<void>;
  onUnlink?: () => Promise<void>;
  onCreateFollowUp?: () => void | Promise<void>;
};

function threadStatusLabel(card: Card): string {
  if (isArchivedCard(card)) return '보관';
  return COLUMN_LABELS[card.column_id] ?? card.column_id;
}

function threadDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
}

export function CardThreadSection({
  card,
  activeCards,
  onOpenCardById,
  onLink,
  onUnlink,
  onCreateFollowUp,
}: CardThreadSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: threadCardsRaw = [] } = useCardThread(card.thread_id);
  const threadCards = useMemo(() => sortThreadCards(threadCardsRaw), [threadCardsRaw]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suggestThreadCandidates(card, activeCards);
    return activeCards
      .filter(
        (other) =>
          other.id !== card.id &&
          (!card.thread_id || other.thread_id !== card.thread_id) &&
          [String(other.handover_no ?? ''), `#${other.handover_no ?? ''}`, other.room, other.title, other.category]
            .join(' ')
            .toLowerCase()
            .includes(q),
      )
      .slice(0, 6);
  }, [query, card, activeCards]);

  async function runLink(target: Card) {
    if (!onLink || busy) return;
    setBusy(true);
    try {
      await onLink(target);
      setPickerOpen(false);
      setQuery('');
    } finally {
      setBusy(false);
    }
  }

  async function runUnlink() {
    if (!onUnlink || busy) return;
    setBusy(true);
    try {
      await onUnlink();
    } finally {
      setBusy(false);
    }
  }

  const hasThread = Boolean(card.thread_id) && threadCards.length > 1;

  return (
    <div className="card-thread">
      {hasThread ? (
        <ol className="card-thread__list">
          {threadCards.map((item) => {
            const isCurrent = item.id === card.id;
            const label = (
              <>
                <span className={`card-thread__status card-thread__status--${isArchivedCard(item) ? 'archive' : item.column_id}`}>
                  {threadStatusLabel(item)}
                </span>
                {item.handover_no ? <span className="card-thread__no">#{item.handover_no}</span> : null}
                <span className="card-thread__title">{item.title}</span>
                <span className="card-thread__date">{threadDateLabel(item.created_at)}</span>
              </>
            );
            return (
              <li key={item.id} className={`card-thread__item${isCurrent ? ' is-current' : ''}`}>
                {isCurrent || !onOpenCardById ? (
                  <span className="card-thread__row">{label}</span>
                ) : (
                  <button
                    type="button"
                    className="card-thread__row card-thread__row--link"
                    onClick={() => onOpenCardById(item.id)}
                  >
                    {label}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="drawer-section__hint">
          누수 신고 → 업체 방문 → 보상 처리처럼 이어지는 건을 연계 카드로 묶어 흐름을 볼 수 있습니다.
        </p>
      )}

      <div className="card-thread__actions">
        {onCreateFollowUp ? (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => void onCreateFollowUp()}
            title="객실·분류를 이어받은 새 카드를 만들고 이 카드와 연계 카드로 연결합니다"
          >
            이어쓰기
          </button>
        ) : null}
        {onLink ? (
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => setPickerOpen((open) => !open)}
          >
            {pickerOpen ? '연결 취소' : '기존 카드 연결'}
          </button>
        ) : null}
        {card.thread_id && onUnlink ? (
          <button
            type="button"
            className="btn btn--ghost btn--small card-thread__unlink"
            disabled={busy}
            onClick={() => void runUnlink()}
            title="이 카드만 연계에서 분리합니다. 나머지 카드들의 연결은 유지됩니다."
          >
            연결 해제
          </button>
        ) : null}
      </div>

      {pickerOpen ? (
        <div className="card-thread__picker">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="번호·객실·제목으로 검색"
            aria-label="연결할 카드 검색"
          />
          {candidates.length ? (
            <ul className="card-thread__candidates">
              {candidates.map((candidate) => (
                <li key={candidate.id}>
                  <button
                    type="button"
                    className="card-thread__candidate"
                    disabled={busy}
                    onClick={() => void runLink(candidate)}
                  >
                    {candidate.handover_no ? (
                      <span className="card-thread__no">#{candidate.handover_no}</span>
                    ) : null}
                    {candidate.room ? <span className="card-thread__room">{candidate.room}</span> : null}
                    <span className="card-thread__title">{candidate.title}</span>
                    <span className="card-thread__join">연결</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="drawer-section__hint">연결할 카드를 찾지 못했습니다. 번호나 객실로 검색해 보세요.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
