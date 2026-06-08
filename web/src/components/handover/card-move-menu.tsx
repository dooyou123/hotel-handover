'use client';

import { COLUMN_LABELS, HANDOVER_COLUMNS } from '@/lib/handover/constants';
import type { Card, ColumnId } from '@/lib/handover/types';

type CardMoveMenuProps = {
  card: Card;
  onMoveToColumn: (columnId: ColumnId) => void;
};

export function CardMoveMenu({ card, onMoveToColumn }: CardMoveMenuProps) {
  const targets = HANDOVER_COLUMNS.filter((column) => column.id !== card.column_id);

  return (
    <div className="card__move" onClick={(event) => event.stopPropagation()}>
      <details className="card__move-details">
        <summary className="card__move-trigger" aria-label="다른 칸으로 이동">
          ⇄
        </summary>
        <div className="card__move-menu" role="menu">
          {targets.map((column) => (
            <button
              key={column.id}
              type="button"
              role="menuitem"
              className="card__move-option"
              onClick={() => onMoveToColumn(column.id)}
            >
              {COLUMN_LABELS[column.id]}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
