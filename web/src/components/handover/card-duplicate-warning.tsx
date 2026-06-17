'use client';

import type { Card } from '@/lib/handover/types';
import { formatAssigneeLabel } from '@/lib/handover/card-utils';

type CardDuplicateWarningProps = {
  duplicates: Card[];
  onOpenCard?: (card: Card) => void;
};

export function CardDuplicateWarning({ duplicates, onOpenCard }: CardDuplicateWarningProps) {
  if (!duplicates.length) return null;

  return (
    <div className="card-duplicate-warning" role="alert">
      <p className="card-duplicate-warning__title">
        진행 중인 유사 카드 {duplicates.length}건이 있습니다
      </p>
      <ul className="card-duplicate-warning__list">
        {duplicates.slice(0, 3).map((item) => (
          <li key={item.id}>
            {onOpenCard ? (
              <button type="button" className="card-duplicate-warning__link" onClick={() => onOpenCard(item)}>
                {item.room ? `${item.room} · ` : ''}
                {item.title}
                {formatAssigneeLabel(item) ? ` · 담당 ${formatAssigneeLabel(item)}` : ''}
              </button>
            ) : (
              <span>
                {item.room ? `${item.room} · ` : ''}
                {item.title}
              </span>
            )}
          </li>
        ))}
      </ul>
      {duplicates.length > 3 ? (
        <p className="card-duplicate-warning__more">외 {duplicates.length - 3}건</p>
      ) : null}
    </div>
  );
}
