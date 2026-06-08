'use client';

import { PRIORITY_LABELS } from '@/lib/handover/constants';
import {
  formatAssigneeLabel,
  formatElapsed,
  formatTime,
  isArchivedCard,
  isUrgentPriorityCard,
} from '@/lib/handover/card-utils';
import type { Card } from '@/lib/handover/types';
import { SearchHighlight } from '@/components/handover/search-highlight';

type HandoverListRowProjectProps = {
  card: Card;
  searchQuery?: string;
  onOpen: () => void;
  onAcknowledge: () => void;
  onMarkDone: () => void;
};

export function HandoverListRowProject({
  card,
  searchQuery = '',
  onOpen,
  onAcknowledge,
  onMarkDone,
}: HandoverListRowProjectProps) {
  const isUrgent = isUrgentPriorityCard(card);
  const isUnacked = isUrgent && card.card_acknowledgments.length === 0;
  const archived = isArchivedCard(card);
  const preview = card.next_action?.trim() || card.details?.trim() || card.resolution?.trim() || '';
  const status =
    archived ? '보관' : card.column_id === 'done' ? '완료' : isUnacked ? '미확인' : '진행';
  const canComplete = !archived && card.column_id !== 'done';

  return (
    <article
      className={[
        'project-list-row',
        isUnacked ? 'is-unacked' : '',
        archived ? 'is-archived' : '',
        card.column_id === 'done' ? 'is-done' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button type="button" className="project-list-row__main" onClick={onOpen}>
        <span className={`project-list-row__status project-list-row__status--${status === '미확인' ? 'warn' : status === '완료' ? 'done' : status === '보관' ? 'archive' : 'active'}`}>
          {status}
        </span>
        <span className="project-list-row__room">
          {card.room ? <SearchHighlight text={card.room} query={searchQuery} /> : '—'}
        </span>
        <span className="project-list-row__title">
          <SearchHighlight text={card.title} query={searchQuery} />
        </span>
        <span className="project-list-row__meta">
          <span className="project-list-row__badge">{PRIORITY_LABELS[card.priority]}</span>
          <span className="project-list-row__badge">{card.category}</span>
          {archived ? <span className="project-list-row__badge project-list-row__badge--archive">완료 보관</span> : null}
        </span>
        {preview ? (
          <span className="project-list-row__preview">
            <SearchHighlight text={preview} query={searchQuery} />
          </span>
        ) : null}
        <span className="project-list-row__foot">
          <span>{card.author || '작성자 미입력'}</span>
          {formatAssigneeLabel(card) ? <span>· 담당 {formatAssigneeLabel(card)}</span> : null}
          <span>· {card.column_id === 'done' ? formatTime(card.updated_at) : formatElapsed(card.updated_at || card.created_at)}</span>
        </span>
      </button>
      <div className="project-list-row__actions">
        {isUnacked ? (
          <button
            type="button"
            className="project-list-row__ack"
            onClick={(event) => {
              event.stopPropagation();
              onAcknowledge();
            }}
          >
            확인
          </button>
        ) : null}
        {canComplete ? (
          <button
            type="button"
            className="project-list-row__done"
            onClick={(event) => {
              event.stopPropagation();
              onMarkDone();
            }}
          >
            완료
          </button>
        ) : null}
      </div>
    </article>
  );
}
