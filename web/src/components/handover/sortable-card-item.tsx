'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '@/lib/handover/types';
import { CardItem } from './card-item';

type SortableCardItemProps = {
  card: Card;
  searchQuery?: string;
  onOpen: () => void;
  onAcknowledge: () => void;
};

export function SortableCardItem({ card, searchQuery, onOpen, onAcknowledge }: SortableCardItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardItem
        card={card}
        searchQuery={searchQuery}
        dragging={isDragging}
        onOpen={onOpen}
        onAcknowledge={onAcknowledge}
      />
    </div>
  );
}
