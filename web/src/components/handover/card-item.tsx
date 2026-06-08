'use client';

import { PRIORITY_LABELS } from '@/lib/handover/constants';
import {
  cardHasKeyword,
  formatAssigneeLabel,
  formatDueLabel,
  formatElapsed,
  formatTime,
  getStaleLevel,
  isCardOverdue,
} from '@/lib/handover/card-utils';
import type { Card, Priority } from '@/lib/handover/types';
import { SearchHighlight } from './search-highlight';

type CardItemProps = {
  card: Card;
  searchQuery?: string;
  dragging?: boolean;
  onOpen: () => void;
  onAcknowledge: () => void;
};

function priorityBadgeClass(priority: Priority): string {
  if (priority === 'urgent') return 'badge badge--urgent';
  if (priority === 'today') return 'badge badge--today';
  return 'badge badge--info';
}

export function CardItem({
  card,
  searchQuery = '',
  dragging = false,
  onOpen,
  onAcknowledge,
}: CardItemProps) {
  const isUrgent = card.column_id === 'urgent';
  const acks = card.card_acknowledgments;
  const isUnacked = isUrgent && acks.length === 0;
  const stale = getStaleLevel(card);
  const hasKeyword = cardHasKeyword(card);
  const overdue = isCardOverdue(card);
  const previewText = card.next_action?.trim() || card.details?.trim() || '';

  const cardClass = [
    'card',
    dragging ? 'is-dragging' : '',
    isUnacked ? 'card--unacked' : '',
    hasKeyword ? 'card--keyword' : '',
    stale === 'mid' ? 'card--stale-mid' : '',
    stale === 'high' ? 'card--stale-high' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article onClick={onOpen} className={cardClass}>
      <div className="card__header">
        <div className="card__tags">
          <span className={priorityBadgeClass(card.priority)}>{PRIORITY_LABELS[card.priority]}</span>
          <span className="badge badge--category">{card.category}</span>
          {card.column_id !== 'done' ? (
            <span className="card__elapsed">{formatElapsed(card.updated_at || card.created_at)}</span>
          ) : null}
        </div>
        {card.room ? (
          <span className="card__room">
            <SearchHighlight text={card.room} query={searchQuery} />
          </span>
        ) : null}
      </div>

      <h4 className="card__title">
        <SearchHighlight text={card.title} query={searchQuery} />
      </h4>

      {previewText && card.column_id !== 'done' ? (
        <p className="card__preview">
          {card.next_action?.trim() ? (
            <span className="card__preview-label">다음</span>
          ) : null}
          <SearchHighlight text={previewText} query={searchQuery} />
        </p>
      ) : null}

      <div className="card__badges">
        {card.details.trim() && card.next_action?.trim() ? (
          <span className="card__detail-badge">상세</span>
        ) : null}
        {card.card_comments.length > 0 ? (
          <span className="card__detail-badge">댓글 {card.card_comments.length}</span>
        ) : null}
        {card.card_attachments.length > 0 ? (
          <span className="card__detail-badge">📷 {card.card_attachments.length}</span>
        ) : null}
        {hasKeyword ? <span className="card__detail-badge card__detail-badge--alert">주의</span> : null}
      </div>

      {formatAssigneeLabel(card) ? (
        <p className="card__meta">
          <span>담당 {formatAssigneeLabel(card)}</span>
        </p>
      ) : null}

      {card.due_at ? (
        <p className={`card__meta${overdue ? ' card__detail-badge--alert' : ''}`} style={{ marginBottom: '0.5rem' }}>
          <span>{formatDueLabel(card.due_at, overdue)}</span>
        </p>
      ) : null}

      {card.column_id === 'done' && card.resolution ? (
        <div className="card__resolution">
          <span>결과</span>
          <span>{card.resolution}</span>
        </div>
      ) : null}

      {card.column_id === 'done' && card.next_action ? (
        <div className="card__action card__action--compact">
          <span className="card__action-label">다음</span>
          <span className="card__action-text">
            <SearchHighlight text={card.next_action} query={searchQuery} />
          </span>
        </div>
      ) : null}

      <div className="card__meta">
        <span>{card.author || '작성자 미입력'}</span>
        <span>{formatTime(card.updated_at || card.created_at)}</span>
      </div>

      {isUrgent ? (
        <div className="card__ack" onClick={(e) => e.stopPropagation()}>
          {acks.length > 0 ? (
            <div className="card__ack-list">
              {acks.map((ack) => (
                <p key={ack.id} className="card__ack-item">
                  ✓ 확인 — {ack.shift} {ack.staff_name} · {formatTime(ack.acknowledged_at)}
                </p>
              ))}
            </div>
          ) : null}
          <button type="button" onClick={onAcknowledge} className="card__ack-btn">
            ✓ 긴급 확인
          </button>
        </div>
      ) : null}
    </article>
  );
}
