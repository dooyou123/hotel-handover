'use client';

import { useMemo } from 'react';
import { buildProjectListSections } from '@/lib/handover/card-utils';
import type { Card } from '@/lib/handover/types';
import { HandoverListRowProject } from './handover-list-row-project';

type HandoverListProjectProps = {
  cards: Card[];
  searchQuery?: string;
  onOpenCard: (card: Card) => void;
  onAcknowledge: (cardId: string) => void;
  onMarkDone: (cardId: string) => void;
};

export function HandoverListProject({
  cards,
  searchQuery,
  onOpenCard,
  onAcknowledge,
  onMarkDone,
}: HandoverListProjectProps) {
  const sections = useMemo(() => buildProjectListSections(cards), [cards]);

  if (!cards.length) {
    return <p className="project-list__empty">표시할 인수인계가 없습니다.</p>;
  }

  return (
    <div className="project-list">
      {sections.map((section) => (
        <section key={section.id} className={`project-list__section project-list__section--${section.id}`}>
          <header className="project-list__head">
            <h3>{section.title}</h3>
            <span>{section.cards.length}</span>
          </header>
          {section.cards.length ? (
            <div className="project-list__rows">
              {section.cards.map((card) => (
                <HandoverListRowProject
                  key={card.id}
                  card={card}
                  searchQuery={searchQuery}
                  onOpen={() => onOpenCard(card)}
                  onAcknowledge={() => onAcknowledge(card.id)}
                  onMarkDone={() => onMarkDone(card.id)}
                />
              ))}
            </div>
          ) : (
            <p className="project-list__section-empty">항목 없음</p>
          )}
        </section>
      ))}
    </div>
  );
}
