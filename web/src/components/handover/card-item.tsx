'use client';

import type { KeyboardEvent } from 'react';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { PRIORITY_LABELS } from '@/lib/handover/constants';
import {
  cardHasKeyword,
  formatAssigneeLabel,
  formatDueLabel,
  formatElapsed,
  formatTime,
  getStaleLevel,
  isArchivedCard,
  isCardOverdue,
  isUrgentPriorityCard,
} from '@/lib/handover/card-utils';
import type { Card, ColumnId, Priority } from '@/lib/handover/types';
import { CardMoveMenu } from './card-move-menu';
import { SearchHighlight } from './search-highlight';

export type CardDragHandle = {
  setActivatorNodeRef: (element: HTMLElement | null) => void;
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
};

type CardItemProps = {
  card: Card;
  searchQuery?: string;
  dragging?: boolean;
  dragHandle?: CardDragHandle;
  onMoveToColumn?: (columnId: ColumnId) => void;
  onOpen: () => void;
  onAcknowledge: () => void;
};

function priorityBadgeClass(priority: Priority): string {
  if (priority === 'urgent') return 'badge badge--urgent';
  if (priority === 'today') return 'badge badge--today';
  return 'badge badge--info';
}

function openCardFromKeyboard(event: KeyboardEvent, onOpen: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onOpen();
  }
}

export function CardItem({
  card,
  searchQuery = '',
  dragging = false,
  dragHandle,
  onMoveToColumn,
  onOpen,
  onAcknowledge,
}: CardItemProps) {
  const isUrgent = isUrgentPriorityCard(card);
  const acks = card.card_acknowledgments;
  const isUnacked = isUrgent && acks.length === 0;
  const stale = getStaleLevel(card);
  const hasKeyword = cardHasKeyword(card);
  const overdue = isCardOverdue(card);
  const archived = isArchivedCard(card);
  const previewText = card.next_action?.trim() || card.details?.trim() || '';

  const cardClass = [
    'card',
    dragging ? 'is-dragging' : '',
    archived ? 'card--archived' : '',
    isUnacked ? 'card--unacked' : '',
    hasKeyword ? 'card--keyword' : '',
    stale === 'mid' ? 'card--stale-mid' : '',
    stale === 'high' ? 'card--stale-high' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={cardClass}>
      <div className="card__shell">
        {dragHandle && !archived ? (
          <button
            type="button"
            ref={dragHandle.setActivatorNodeRef}
            className="card__drag-handle"
            aria-label="드래그하여 이동"
            onClick={(event) => event.stopPropagation()}
            {...dragHandle.attributes}
            {...dragHandle.listeners}
          >
            ⠿
          </button>
        ) : null}

        <div
          className="card__main"
          role="button"
          tabIndex={0}
          onClick={onOpen}
          onKeyDown={(event) => openCardFromKeyboard(event, onOpen)}
        >
          <div className="card__header">
            <div className="card__tags">
              {archived ? <span className="badge badge--archived">완료 보관</span> : null}
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
              {card.next_action?.trim() ? <span className="card__preview-label">다음</span> : null}
              <SearchHighlight text={previewText} query={searchQuery} />
            </p>
          ) : null}

          {(card.details.trim() && card.next_action?.trim()) ||
          card.card_comments.length > 0 ||
          card.card_attachments.length > 0 ||
          hasKeyword ? (
            <div className="card__hints">
              {card.details.trim() && card.next_action?.trim() ? <span className="card__hint">상세</span> : null}
              {card.card_comments.length > 0 ? (
                <span className="card__hint">댓글 {card.card_comments.length}</span>
              ) : null}
              {card.card_attachments.length > 0 ? (
                <span className="card__hint">사진 {card.card_attachments.length}</span>
              ) : null}
              {hasKeyword ? <span className="card__hint card__hint--alert">주의</span> : null}
            </div>
          ) : null}

          {formatAssigneeLabel(card) ? (
            <p className="card__meta">
              <span>담당 {formatAssigneeLabel(card)}</span>
            </p>
          ) : null}

          {card.due_at ? (
            <p
              className={`card__meta${overdue ? ' card__detail-badge--alert' : ''}`}
              style={{ marginBottom: '0.5rem' }}
            >
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
        </div>

        {onMoveToColumn && !archived ? <CardMoveMenu card={card} onMoveToColumn={onMoveToColumn} /> : null}
      </div>

      {isUrgent ? (
        <div className="card__ack" onClick={(event) => event.stopPropagation()}>
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
            긴급 확인
          </button>
        </div>
      ) : null}
    </article>
  );
}
