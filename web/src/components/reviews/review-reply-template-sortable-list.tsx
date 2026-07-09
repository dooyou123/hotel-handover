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
import {
  REVIEW_REPLY_CHANNEL_LABELS,
  REVIEW_REPLY_SENTIMENT_LABELS,
  missingReplyLocales,
  replyLocaleCompletionCount,
  type ReviewReplyTemplate,
} from '@/lib/reviews/reply-templates';

type ReviewReplyTemplateSortableListProps = {
  templates: ReviewReplyTemplate[];
  selectedId: string | null;
  disabled?: boolean;
  onSelect: (template: ReviewReplyTemplate) => void;
  onReorder: (orderedIds: string[]) => void;
};

function SortableTemplateRow({
  template,
  selected,
  disabled,
  onSelect,
}: {
  template: ReviewReplyTemplate;
  selected: boolean;
  disabled?: boolean;
  onSelect: (template: ReviewReplyTemplate) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: template.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const missing = missingReplyLocales(template);
  const localeCount = replyLocaleCompletionCount(template);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`review-reply-settings__compact-row${selected ? ' is-active' : ''}${isDragging ? ' is-dragging' : ''}`}
    >
      <button
        type="button"
        className="review-reply-settings__handle"
        aria-label={`${template.title} 순서 변경`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <button type="button" className="review-reply-settings__compact-btn" onClick={() => onSelect(template)}>
        <span className="review-reply-settings__compact-title">{template.title}</span>
        <span className="review-reply-settings__compact-badges">
          <span className={`review-reply-settings__badge review-reply-settings__badge--${template.sentiment}`}>
            {REVIEW_REPLY_SENTIMENT_LABELS[template.sentiment]}
          </span>
          <span className="review-reply-settings__badge review-reply-settings__badge--channel">
            {REVIEW_REPLY_CHANNEL_LABELS[template.channel]}
          </span>
          <span
            className={`review-reply-settings__badge review-reply-settings__badge--locales${missing.length ? ' is-incomplete' : ''}`}
            title={missing.length ? '누락 언어 있음' : '4개 언어 모두 있음'}
          >
            {localeCount}/4
          </span>
        </span>
      </button>
    </li>
  );
}

export function ReviewReplyTemplateSortableList({
  templates,
  selectedId,
  disabled,
  onSelect,
  onReorder,
}: ReviewReplyTemplateSortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = templates.findIndex((row) => row.id === active.id);
    const newIndex = templates.findIndex((row) => row.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = [...templates];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onReorder(next.map((row) => row.id));
  }

  if (!templates.length) {
    return <p className="review-reply-settings__empty">등록된 답변 템플릿이 없습니다.</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={templates.map((row) => row.id)} strategy={verticalListSortingStrategy}>
        <ul className="review-reply-settings__compact-list">
          {templates.map((template) => (
            <SortableTemplateRow
              key={template.id}
              template={template}
              selected={template.id === selectedId}
              disabled={disabled}
              onSelect={onSelect}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
