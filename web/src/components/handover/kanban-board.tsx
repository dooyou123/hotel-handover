'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { HANDOVER_COLUMNS } from '@/lib/handover/constants';
import { sortCardsInColumn } from '@/lib/handover/card-utils';
import type { Card, ColumnId } from '@/lib/handover/types';
import { CardItem } from './card-item';
import { KanbanColumn } from './kanban-column';

type KanbanBoardProps = {
  cards: Card[];
  searchQuery?: string;
  onMove: (cardId: string, columnId: ColumnId, orderedIds: string[]) => Promise<void>;
  onOpenCard: (card: Card) => void;
  onAcknowledge: (cardId: string) => void;
};

export function KanbanBoard({ cards, searchQuery, onMove, onOpenCard, onAcknowledge }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const columns = useMemo(
    () =>
      HANDOVER_COLUMNS.reduce(
        (acc, column) => {
          acc[column.id] = sortCardsInColumn(cards, column.id);
          return acc;
        },
        {} as Record<ColumnId, Card[]>,
      ),
    [cards],
  );

  const activeCard = activeId ? cards.find((card) => card.id === activeId) : null;

  const handleMoveToColumn = useCallback(
    async (cardId: string, targetColumn: ColumnId) => {
      const card = cards.find((item) => item.id === cardId);
      if (!card || card.column_id === targetColumn) return;

      const targetCards = [...columns[targetColumn].filter((item) => item.id !== cardId), card];
      await onMove(cardId, targetColumn, targetCards.map((item) => item.id));
    },
    [cards, columns, onMove],
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const cardId = String(active.id);
    const card = cards.find((item) => item.id === cardId);
    if (!card) return;

    const overId = String(over.id);
    let targetColumn: ColumnId;
    let targetCards: Card[];

    if (HANDOVER_COLUMNS.some((column) => column.id === overId)) {
      targetColumn = overId as ColumnId;
      targetCards = [...columns[targetColumn].filter((item) => item.id !== cardId), card];
    } else {
      const overCard = cards.find((item) => item.id === overId);
      if (!overCard) return;
      targetColumn = overCard.column_id;
      const columnCards = columns[targetColumn].filter((item) => item.id !== cardId);
      const overIndex = columnCards.findIndex((item) => item.id === overId);
      columnCards.splice(overIndex >= 0 ? overIndex : columnCards.length, 0, card);
      targetCards = columnCards;
    }

    const previousOrder = columns[targetColumn].map((item) => item.id).join(',');
    const nextOrder = targetCards.map((item) => item.id).join(',');
    if (card.column_id === targetColumn && previousOrder === nextOrder) return;

    await onMove(cardId, targetColumn, targetCards.map((item) => item.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
      onDragEnd={handleDragEnd}
    >
      <div className="board">
        {HANDOVER_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            cards={columns[column.id]}
            searchQuery={searchQuery}
            onOpenCard={onOpenCard}
            onAcknowledge={onAcknowledge}
            onMoveToColumn={handleMoveToColumn}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <CardItem
            card={activeCard}
            searchQuery={searchQuery}
            dragging
            onOpen={() => {}}
            onAcknowledge={() => {}}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
