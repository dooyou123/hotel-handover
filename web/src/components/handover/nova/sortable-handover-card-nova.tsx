'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { isArchivedCard } from '@/lib/handover/card-utils';
import type { Card, ColumnId } from '@/lib/handover/types';
import { HandoverCardNova } from './handover-card-nova';

type SortableHandoverCardNovaProps = {
  card: Card;
  searchQuery?: string;
  onOpen: () => void;
  onAcknowledge: () => void;
  onMoveToColumn: (columnId: ColumnId) => void;
};

export function SortableHandoverCardNova({
  card,
  searchQuery,
  onOpen,
  onAcknowledge,
  onMoveToColumn,
}: SortableHandoverCardNovaProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled: isArchivedCard(card) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="nova-sortable-card">
      <HandoverCardNova
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
