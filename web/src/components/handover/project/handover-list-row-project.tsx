'use client';

import { PRIORITY_LABELS } from '@/lib/handover/constants';
import {
  formatAssigneeLabel,
  formatUpdatedAt,
  isArchivedCard,
  isUrgentPriorityCard,
} from '@/lib/handover/card-utils';
import type { Card } from '@/lib/handover/types';
import { ComplaintSlaBadge } from '@/components/handover/complaint-sla-badge';
import { SearchHighlight } from '@/components/handover/search-highlight';
import { HandoverCardListExtras } from './handover-card-list-extras';

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
  const author = card.author?.trim() || '미입력';
  const assignee = formatAssigneeLabel(card);
  const updatedAt = formatUpdatedAt(card.updated_at || card.created_at);

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
        <span className="project-list-row__room project-list-row__clamp-1" title={card.room || undefined}>
          {card.room ? <SearchHighlight text={card.room} query={searchQuery} /> : '—'}
        </span>
        <span className="project-list-row__title project-list-row__clamp-2" title={card.title}>
          <SearchHighlight text={card.title} query={searchQuery} />
        </span>
        <span className="project-list-row__meta">
          <span className="project-list-row__badge">{PRIORITY_LABELS[card.priority]}</span>
          <span className="project-list-row__badge">{card.category}</span>
          {archived ? <span className="project-list-row__badge project-list-row__badge--archive">완료 보관</span> : null}
        </span>
        {preview ? (
          <span className="project-list-row__preview project-list-row__clamp-2" title={preview}>
            <SearchHighlight text={preview} query={searchQuery} />
          </span>
        ) : null}
        <ComplaintSlaBadge card={card} />
        <span className="project-list-row__foot">
          <span className="project-list-row__people">
            <span className="project-list-row__person">
              <em className="project-list-row__person-label">작성</em>
              <span className="project-list-row__person-name" title={author}>
                {author}
              </span>
            </span>
            {assignee ? (
              <span className="project-list-row__person project-list-row__person--assignee">
                <em className="project-list-row__person-label">담당</em>
                <span className="project-list-row__person-name" title={assignee}>
                  {assignee}
                </span>
              </span>
            ) : null}
          </span>
          {updatedAt.label ? (
            <time className="project-list-row__updated" dateTime={updatedAt.iso} title={updatedAt.title}>
              {updatedAt.label}
            </time>
          ) : null}
        </span>
        <HandoverCardListExtras card={card} />
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
