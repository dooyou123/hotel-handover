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
import { CardMoveMenu } from '@/components/handover/card-move-menu';
import { SearchHighlight } from '@/components/handover/search-highlight';

export type NovaCardDragHandle = {
  setActivatorNodeRef: (element: HTMLElement | null) => void;
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
};

type HandoverCardNovaProps = {
  card: Card;
  searchQuery?: string;
  dragging?: boolean;
  dragHandle?: NovaCardDragHandle;
  onMoveToColumn?: (columnId: ColumnId) => void;
  onOpen: () => void;
  onAcknowledge: () => void;
};

function priorityClass(priority: Priority): string {
  if (priority === 'urgent') return 'nova-card__badge nova-card__badge--urgent';
  if (priority === 'today') return 'nova-card__badge nova-card__badge--today';
  return 'nova-card__badge nova-card__badge--info';
}

function openFromKeyboard(event: KeyboardEvent, onOpen: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onOpen();
  }
}

export function HandoverCardNova({
  card,
  searchQuery = '',
  dragging = false,
  dragHandle,
  onMoveToColumn,
  onOpen,
  onAcknowledge,
}: HandoverCardNovaProps) {
  const isUrgent = isUrgentPriorityCard(card);
  const acks = card.card_acknowledgments;
  const isUnacked = isUrgent && acks.length === 0;
  const stale = getStaleLevel(card);
  const hasKeyword = cardHasKeyword(card);
  const overdue = isCardOverdue(card);
  const archived = isArchivedCard(card);
  const previewText = card.next_action?.trim() || card.details?.trim() || '';

  const cardClass = [
    'nova-card',
    dragging ? 'is-dragging' : '',
    archived ? 'is-archived' : '',
    isUnacked ? 'is-unacked' : '',
    hasKeyword ? 'has-keyword' : '',
    stale === 'mid' ? 'is-stale-mid' : '',
    stale === 'high' ? 'is-stale-high' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={cardClass}>
      <div className="nova-card__shell">
        {dragHandle && !archived ? (
          <button
            type="button"
            ref={dragHandle.setActivatorNodeRef}
            className="nova-card__drag"
            aria-label="드래그하여 이동"
            onClick={(event) => event.stopPropagation()}
            {...dragHandle.attributes}
            {...dragHandle.listeners}
          >
            ⠿
          </button>
        ) : null}

        <div
          className="nova-card__body"
          role="button"
          tabIndex={0}
          onClick={onOpen}
          onKeyDown={(event) => openFromKeyboard(event, onOpen)}
        >
          <div className="nova-card__head">
            {card.room ? (
              <span className="nova-card__room">
                <SearchHighlight text={card.room} query={searchQuery} />
              </span>
            ) : (
              <span className="nova-card__room nova-card__room--empty">—</span>
            )}
            {card.column_id !== 'done' ? (
              <span className="nova-card__elapsed">{formatElapsed(card.updated_at || card.created_at)}</span>
            ) : null}
          </div>

          <h4 className="nova-card__title">
            <SearchHighlight text={card.title} query={searchQuery} />
          </h4>

          <div className="nova-card__badges">
            {archived ? (
              <span className="nova-card__badge nova-card__badge--archived">완료 보관</span>
            ) : null}
            <span className={priorityClass(card.priority)}>{PRIORITY_LABELS[card.priority]}</span>
            <span className="nova-card__badge nova-card__badge--category">{card.category}</span>
          </div>

          {previewText && card.column_id !== 'done' ? (
            <p className="nova-card__preview">
              {card.next_action?.trim() ? <span className="nova-card__preview-label">다음</span> : null}
              <SearchHighlight text={previewText} query={searchQuery} />
            </p>
          ) : null}

          <div className="nova-card__foot">
            <span className="nova-card__foot-main">
              <span className="nova-card__author">{card.author || '작성자 미입력'}</span>
              {formatAssigneeLabel(card) ? (
                <span className="nova-card__assignee">· 담당 {formatAssigneeLabel(card)}</span>
              ) : null}
            </span>
            <time className="nova-card__time">{formatTime(card.updated_at || card.created_at)}</time>
          </div>

          {card.due_at ? (
            <p className={`nova-card__due${overdue ? ' is-overdue' : ''}`}>{formatDueLabel(card.due_at, overdue)}</p>
          ) : null}
        </div>

        {onMoveToColumn && !archived ? <CardMoveMenu card={card} onMoveToColumn={onMoveToColumn} /> : null}
      </div>

      {isUrgent ? (
        <div className="nova-card__ack" onClick={(event) => event.stopPropagation()}>
          {acks.length > 0 ? (
            <p className="nova-card__ack-done">
              ✓ {acks[0].shift} {acks[0].staff_name} · {formatTime(acks[0].acknowledged_at)}
            </p>
          ) : null}
          <button type="button" onClick={onAcknowledge} className="nova-card__ack-btn">
            긴급 확인
          </button>
        </div>
      ) : null}
    </article>
  );
}
