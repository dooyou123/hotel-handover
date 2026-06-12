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
import { HandoverCardCommentSection } from './handover-card-comment-section';

type HandoverListRowProjectProps = {
  card: Card;
  position?: { index: number; total: number };
  searchQuery?: string;
  onOpen: () => void;
  onOpenComments: () => void;
  onAddComment: (content: string) => Promise<void>;
  staffName: string;
  commentDisabled?: boolean;
  onAcknowledge: () => void;
  onMarkDone: () => void;
};

export function HandoverListRowProject({
  card,
  position,
  searchQuery = '',
  onOpen,
  onOpenComments,
  onAddComment,
  staffName,
  commentDisabled = false,
  onAcknowledge,
  onMarkDone,
}: HandoverListRowProjectProps) {
  const isUrgent = isUrgentPriorityCard(card);
  const isUnacked = isUrgent && card.card_acknowledgments.length === 0;
  const archived = isArchivedCard(card);
  const preview = card.next_action?.trim() || card.details?.trim() || card.resolution?.trim() || '';
  const status = archived
    ? '보관'
    : card.column_id === 'done'
      ? '완료'
      : card.column_id === 'hold'
        ? '보류'
        : isUnacked
          ? '미확인'
          : '진행';
  const canComplete = !archived && card.column_id !== 'done';
  const author = card.author?.trim() || '미입력';
  const assignee = formatAssigneeLabel(card);
  const updatedAt = formatUpdatedAt(card.updated_at || card.created_at);

  const statusClass =
    status === '미확인'
      ? 'warn'
      : status === '완료'
        ? 'done'
        : status === '보관'
          ? 'archive'
          : status === '보류'
            ? 'hold'
            : 'active';

  return (
    <article
      className={[
        'project-list-row',
        isUnacked ? 'is-unacked' : '',
        archived ? 'is-archived' : '',
        card.column_id === 'done' ? 'is-done' : '',
        card.column_id === 'hold' ? 'is-hold' : '',
        isUrgent ? 'is-urgent-priority' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="project-list-row__body">
        <button type="button" className="project-list-row__main" onClick={onOpen}>
          <div className="project-list-row__top">
            <span className={`project-list-row__status project-list-row__status--${statusClass}`}>
              {status}
            </span>
            {card.room ? (
              <span className="project-list-row__room" title={card.room}>
                <SearchHighlight text={card.room} query={searchQuery} />
              </span>
            ) : null}
            <span className="project-list-row__meta">
              <span
                className={`project-list-row__badge${isUrgent ? ' project-list-row__badge--urgent' : ''}`}
              >
                {PRIORITY_LABELS[card.priority]}
              </span>
              <span className="project-list-row__badge">{card.category}</span>
              {archived ? (
                <span className="project-list-row__badge project-list-row__badge--archive">완료 보관</span>
              ) : null}
            </span>
            <ComplaintSlaBadge card={card} />
          </div>

          <span className="project-list-row__title" title={card.title}>
            {position ? (
              <span className="project-list-row__position" aria-label={`${position.index}번째, 남은 ${position.total}건`}>
                {position.index}/{position.total}
              </span>
            ) : null}
            <SearchHighlight text={card.title} query={searchQuery} />
          </span>

          {preview ? (
            <span className="project-list-row__preview" title={preview}>
              <SearchHighlight text={preview} query={searchQuery} />
            </span>
          ) : null}

          <span className="project-list-row__foot">
            <span className="project-list-row__people">
              <span>{author}</span>
              {assignee ? (
                <>
                  <span className="project-list-row__foot-sep">·</span>
                  <span>담당 {assignee}</span>
                </>
              ) : null}
            </span>
            {updatedAt.label ? (
              <time className="project-list-row__updated" dateTime={updatedAt.iso} title={updatedAt.title}>
                {updatedAt.label}
              </time>
            ) : null}
          </span>
        </button>
        <HandoverCardCommentSection
          card={card}
          staffName={staffName}
          disabled={commentDisabled}
          onAddComment={onAddComment}
          onOpenComments={onOpenComments}
        />
      </div>
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
