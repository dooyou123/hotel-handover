'use client';

import { formatHoldStaleBadge, getHoldStaleLevel, isLongHoldCard } from '@/lib/handover/card-utils';
import type { Card } from '@/lib/handover/types';

type AsideLongHoldPanelProps = {
  cards: Card[];
  onOpenCardById?: (cardId: string) => void;
  onShowAll: () => void;
};

export function AsideLongHoldPanel({ cards, onOpenCardById, onShowAll }: AsideLongHoldPanelProps) {
  const longHold = cards.filter(isLongHoldCard).slice(0, 5);
  if (!longHold.length) return null;

  return (
    <section className="aside-card aside-card--long-hold" aria-label="장기 보류">
      <header className="aside-card__head">
        <h3 className="aside-card__title">장기 보류</h3>
        <button type="button" className="aside-card__more" onClick={onShowAll}>
          전체
        </button>
      </header>
      <p className="aside-long-hold__lead">24시간 이상 멈춰 둔 인수인계입니다.</p>
      <ul className="aside-long-hold__list">
        {longHold.map((card) => {
          const level = getHoldStaleLevel(card);
          return (
            <li key={card.id}>
              <button
                type="button"
                className="aside-long-hold__item"
                onClick={() => (onOpenCardById ? onOpenCardById(card.id) : onShowAll())}
              >
                <span className="aside-long-hold__title">{card.title}</span>
                <span className="aside-long-hold__meta">
                  {card.room ? `${card.room} · ` : ''}
                  {level ? formatHoldStaleBadge(level) : '장기 보류'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
