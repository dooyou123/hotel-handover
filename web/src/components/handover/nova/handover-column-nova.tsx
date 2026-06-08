'use client';

import type { CSSProperties } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Card, ColumnId } from '@/lib/handover/types';
import { SortableHandoverCardNova } from './sortable-handover-card-nova';

const NOVA_COLUMN_COPY: Record<ColumnId, { title: string; hint: string }> = {
  urgent: { title: '긴급', hint: '' },
  progress: { title: '진행중', hint: '긴급 우선순위가 맨 위 · 처리 중 업무' },
  done: { title: '완료', hint: '처리 완료 — 교대 끝나면 보관' },
};

type HandoverColumnNovaProps = {
  column: { id: ColumnId; title: string; hint: string; columnClass: string };
  cards: Card[];
  searchQuery?: string;
  onOpenCard: (card: Card) => void;
  onAcknowledge: (cardId: string) => void;
  onMoveToColumn: (cardId: string, columnId: ColumnId) => void;
};

export function HandoverColumnNova({
  column,
  cards,
  searchQuery,
  onOpenCard,
  onAcknowledge,
  onMoveToColumn,
}: HandoverColumnNovaProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const tone = column.id === 'done' ? 'done' : 'progress';
  const copy = NOVA_COLUMN_COPY[column.id] ?? { title: column.title, hint: column.hint };

  return (
    <section className={`nova-column nova-column--${tone}${isOver ? ' is-drop-target' : ''}`}>
      <header className="nova-column__head">
        <div>
          <h3 className="nova-column__title">{copy.title}</h3>
          <p className="nova-column__hint">{copy.hint}</p>
        </div>
        <span className="nova-column__count" key={cards.length}>
          {cards.length}
        </span>
      </header>

      <div ref={setNodeRef} className="nova-column__list">
        <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card, index) => (
            <div
              key={card.id}
              className="nova-column__item"
              style={{ '--nova-stagger': `${Math.min(index, 8) * 40}ms` } as CSSProperties}
            >
              <SortableHandoverCardNova
                card={card}
                searchQuery={searchQuery}
                onOpen={() => onOpenCard(card)}
                onAcknowledge={() => onAcknowledge(card.id)}
                onMoveToColumn={(columnId) => onMoveToColumn(card.id, columnId)}
              />
            </div>
          ))}
        </SortableContext>
        {!cards.length ? <p className="nova-column__empty">카드 없음</p> : null}
      </div>
    </section>
  );
}
