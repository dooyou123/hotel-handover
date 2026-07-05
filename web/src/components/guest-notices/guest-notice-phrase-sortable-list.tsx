'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { phraseBodyForLocale, type GuestNoticePhrase } from '@/lib/guest-notices/types';

type GuestNoticePhraseSortableListProps = {
  phrases: GuestNoticePhrase[];
  disabled?: boolean;
  onReorder: (orderedIds: string[]) => void;
  onEdit: (phrase: GuestNoticePhrase) => void;
};

function SortablePhraseRow({
  phrase,
  disabled,
  onEdit,
}: {
  phrase: GuestNoticePhrase;
  disabled?: boolean;
  onEdit: (phrase: GuestNoticePhrase) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: phrase.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`guest-notice-settings__phrase-row${isDragging ? ' is-dragging' : ''}`}
    >
      <button
        type="button"
        className="guest-notice-settings__phrase-handle"
        aria-label={`${phrase.title} 순서 변경`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <button type="button" className="guest-notice-settings__phrase-item" onClick={() => onEdit(phrase)}>
        <strong>{phrase.title}</strong>
        <span>{phraseBodyForLocale(phrase, 'ko').split('\n')[0]}</span>
      </button>
    </li>
  );
}

export function GuestNoticePhraseSortableList({
  phrases,
  disabled,
  onReorder,
  onEdit,
}: GuestNoticePhraseSortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = phrases.findIndex((row) => row.id === active.id);
    const newIndex = phrases.findIndex((row) => row.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = [...phrases];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onReorder(next.map((row) => row.id));
  }

  if (!phrases.length) {
    return <p className="guest-notice-settings__empty">등록된 상용구가 없습니다.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={phrases.map((row) => row.id)} strategy={verticalListSortingStrategy}>
        <ul className="guest-notice-settings__phrase-list">
          {phrases.map((phrase) => (
            <SortablePhraseRow key={phrase.id} phrase={phrase} disabled={disabled} onEdit={onEdit} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
