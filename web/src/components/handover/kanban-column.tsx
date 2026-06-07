'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Card, ColumnId } from '@/lib/handover/types';
import { SortableCardItem } from './sortable-card-item';

type KanbanColumnProps = {
  column: { id: ColumnId; title: string; hint: string; columnClass: string };
  cards: Card[];
  onOpenCard: (card: Card) => void;
  onAcknowledge: (cardId: string) => void;
};

export function KanbanColumn({ column, cards, onOpenCard, onAcknowledge }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <section className={`column ${column.columnClass}`}>
      <header className="column__header">
        <h3 className="column__title">{column.title}</h3>
        <span className="column__count">{cards.length}</span>
      </header>
      <p className="column__hint">{column.hint}</p>
      <div ref={setNodeRef} className={`column__list${isOver ? ' is-drag-over' : ''}`}>
        <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCardItem
              key={card.id}
              card={card}
              onOpen={() => onOpenCard(card)}
              onAcknowledge={() => onAcknowledge(card.id)}
            />
          ))}
        </SortableContext>
        {!cards.length ? <p className="empty-state">카드 없음</p> : null}
      </div>
    </section>
  );
}
