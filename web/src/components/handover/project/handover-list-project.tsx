'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [doneExpanded, setDoneExpanded] = useState(false);
  const doneSectionRef = useRef<HTMLElement>(null);
  const scrollDoneOnExpandRef = useRef(false);
  const sections = useMemo(() => buildProjectListSections(cards), [cards]);

  useEffect(() => {
    if (!doneExpanded || !scrollDoneOnExpandRef.current) return;
    scrollDoneOnExpandRef.current = false;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const section = doneSectionRef.current;
        if (!section) return;

        const scrollParent = section.closest('.project-handover__main-body') as HTMLElement | null;
        if (!scrollParent) {
          section.scrollIntoView({ behavior: 'smooth', block: 'end' });
          return;
        }

        const sectionRect = section.getBoundingClientRect();
        const parentRect = scrollParent.getBoundingClientRect();
        const bottomOverflow = sectionRect.bottom - parentRect.bottom;
        const topOverflow = sectionRect.top - parentRect.top;

        if (bottomOverflow > 0) {
          scrollParent.scrollBy({ top: bottomOverflow + 16, behavior: 'smooth' });
        } else if (topOverflow < 0) {
          scrollParent.scrollBy({ top: topOverflow - 8, behavior: 'smooth' });
        }
      });
    });
  }, [doneExpanded]);

  function toggleDoneExpanded() {
    setDoneExpanded((open) => {
      if (!open) scrollDoneOnExpandRef.current = true;
      return !open;
    });
  }

  if (!cards.length) {
    return <p className="project-list__empty">표시할 인수인계가 없습니다.</p>;
  }

  return (
    <div className="project-list">
      {sections.map((section) => {
        const isDoneSection = section.id === 'done';
        const isCollapsible = isDoneSection && section.cards.length > 0;
        const isExpanded = !isCollapsible || doneExpanded;

        const head = isCollapsible ? (
          <button
            type="button"
            className="project-list__head project-list__head--toggle"
            aria-expanded={doneExpanded}
            onClick={toggleDoneExpanded}
          >
            <span className="project-list__head-main">
              <h3>{section.title}</h3>
              <span className="project-list__count">{section.cards.length}</span>
            </span>
            <span className="project-list__toggle-label">{doneExpanded ? '접기' : '펼치기'}</span>
          </button>
        ) : (
          <header className="project-list__head">
            <h3>{section.title}</h3>
            <span className="project-list__count">{section.cards.length}</span>
          </header>
        );

        return (
          <section
            key={section.id}
            ref={isDoneSection ? doneSectionRef : undefined}
            className={`project-list__section project-list__section--${section.id}${isCollapsible && !doneExpanded ? ' is-collapsed' : ''}`}
          >
            {head}
            {isExpanded ? (
              section.cards.length ? (
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
              )
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
