'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, ColumnId } from '@/lib/handover/types';
import { CardItem } from './card-item';

type SortableCardItemProps = {
  card: Card;
  searchQuery?: string;
  onOpen: () => void;
  onAcknowledge: () => void;
  onMoveToColumn: (columnId: ColumnId) => void;
};

export function SortableCardItem({
  card,
  searchQuery,
  onOpen,
  onAcknowledge,
  onMoveToColumn,
}: SortableCardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="sortable-card">
      <CardItem
        card={card}
        searchQuery={searchQuery}
        dragging={isDragging}
        dragHandle={{ setActivatorNodeRef, attributes, listeners }}
        onMoveToColumn={onMoveToColumn}
        onOpen={onOpen}
        onAcknowledge={onAcknowledge}
      />
    </div>
  );
}
