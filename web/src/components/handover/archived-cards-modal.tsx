'use client';

import { useMemo, useState } from 'react';
import { formatArchiveTime, formatAssigneeLabel, formatTime } from '@/lib/handover/card-utils';
import { formatComplaintRemedies } from '@/lib/handover/complaint-remedies';
import type { Card } from '@/lib/handover/types';
import { LinkifiedText } from '@/components/ui/linkified-text';
import { closeOnOverlayClick } from '@/lib/ui/close-on-overlay-click';

type ArchivedCardsModalProps = {
  open: boolean;
  cards: Card[];
  isLoading: boolean;
  isManager: boolean;
  onClose: () => void;
  onOpenCard: (card: Card) => void;
  onRestore?: (cardId: string) => Promise<void>;
};

export function ArchivedCardsModal({
  open,
  cards,
  isLoading,
  isManager,
  onClose,
  onOpenCard,
  onRestore,
}: ArchivedCardsModalProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((card) => {
      const haystack = [
        card.room,
        card.title,
        card.details,
        card.resolution,
        card.category,
        card.author,
        formatComplaintRemedies(card.complaint_remedies, card.complaint_remedy_other),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [cards, query]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={closeOnOverlayClick(onClose)}>
      <div className="modal modal--activity" onClick={(event) => event.stopPropagation()}>
        <div className="activity-modal">
          <div className="modal__header">
            <div>
              <h2>완료 보관함</h2>
              <p className="shift-modal__sub">완료 비우기로 보관된 인수인계 — 삭제되지 않고 여기에 남습니다.</p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="activity-modal__search">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="객실·내용 검색…"
              autoComplete="off"
              aria-label="보관함 검색"
            />
          </div>

          <div className="activity-modal__body">
            {isLoading ? (
              <p className="shift-empty">불러오는 중…</p>
            ) : filtered.length ? (
              filtered.map((card) => {
                const assignee = formatAssigneeLabel(card);
                return (
                  <article key={card.id} className="activity-item activity-item--archived">
                    <div className="activity-item__top">
                      <span className="activity-item__action activity-item__action--archive">완료 보관</span>
                      <span className="activity-item__time">{formatArchiveTime(card.archived_at)}</span>
                    </div>
                    <button type="button" className="activity-item__link" onClick={() => onOpenCard(card)}>
                      <p className="activity-item__summary">
                        {card.room ? `[${card.room}] ` : ''}
                        {card.title}
                      </p>
                      {card.resolution ? (
                        <p className="activity-item__detail">
                          <LinkifiedText text={card.resolution} as="span" />
                        </p>
                      ) : null}
                      <p className="activity-item__meta">
                        {card.author || '작성자 미입력'}
                        {assignee ? ` · 담당 ${assignee}` : ''}
                        {' · 완료 '}
                        {formatTime(card.updated_at || card.created_at)}
                      </p>
                    </button>
                    {isManager && onRestore ? (
                      <button
                        type="button"
                        className="btn btn--outline btn--small activity-item__restore"
                        onClick={() => onRestore(card.id)}
                      >
                        완료 칸으로 복원
                      </button>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <p className="shift-empty">
                {query.trim() ? '검색 결과가 없습니다.' : '보관된 완료 인수인계가 없습니다.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
