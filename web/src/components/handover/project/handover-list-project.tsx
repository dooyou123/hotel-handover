'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildProjectListSections } from '@/lib/handover/card-utils';
import type { Card } from '@/lib/handover/types';
import { HandoverListRowProject } from './handover-list-row-project';

type HandoverListProjectProps = {
  cards: Card[];
  searchQuery?: string;
  staffNames: string[];
  onOpenCard: (card: Card) => void;
  onOpenCardComments: (card: Card) => void;
  onAddComment: (cardId: string, content: string) => Promise<void>;
  staffName: string;
  commentDisabled?: boolean;
  onAcknowledge: (cardId: string) => void;
  onMarkDone: (cardId: string) => void;
  onHold: (cardId: string) => void;
  onResume: (cardId: string) => void;
  onAssignChange: (cardId: string, assigneeName: string) => void;
};

type CollapsibleSectionId = 'done' | 'hold';

export function HandoverListProject({
  cards,
  searchQuery,
  staffNames,
  onOpenCard,
  onOpenCardComments,
  onAddComment,
  staffName,
  commentDisabled = false,
  onAcknowledge,
  onMarkDone,
  onHold,
  onResume,
  onAssignChange,
}: HandoverListProjectProps) {
  const [expandedSections, setExpandedSections] = useState<Record<CollapsibleSectionId, boolean>>({
    done: false,
    hold: false,
  });
  const doneSectionRef = useRef<HTMLElement>(null);
  const scrollDoneOnExpandRef = useRef(false);
  const sections = useMemo(() => buildProjectListSections(cards), [cards]);
  const remainingTotal = useMemo(
    () =>
      sections
        .filter((section) => section.id === 'unacked' || section.id === 'progress')
        .reduce((sum, section) => sum + section.cards.length, 0),
    [sections],
  );
  let remainingIndex = 0;

  useEffect(() => {
    if (!expandedSections.done || !scrollDoneOnExpandRef.current) return;
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
  }, [expandedSections.done]);

  function toggleSection(sectionId: CollapsibleSectionId) {
    setExpandedSections((prev) => {
      const nextOpen = !prev[sectionId];
      if (sectionId === 'done' && nextOpen) scrollDoneOnExpandRef.current = true;
      return { ...prev, [sectionId]: nextOpen };
    });
  }

  function isCollapsibleSection(sectionId: string): sectionId is CollapsibleSectionId {
    return sectionId === 'done' || sectionId === 'hold';
  }

  if (!cards.length) {
    return <p className="project-list__empty">표시할 인수인계가 없습니다.</p>;
  }

  return (
    <div className="project-list">
      {sections.map((section) => {
        if (
          section.cards.length === 0 &&
          (section.id === 'done' || section.id === 'progress')
        ) {
          return null;
        }

        const isDoneSection = section.id === 'done';
        const collapsibleId =
          isCollapsibleSection(section.id) && section.cards.length > 0 ? section.id : null;
        const isExpanded = collapsibleId === null || expandedSections[collapsibleId];

        const head = collapsibleId ? (
          <button
            type="button"
            className="project-list__head project-list__head--toggle"
            aria-expanded={expandedSections[collapsibleId]}
            onClick={() => toggleSection(collapsibleId)}
          >
            <span className="project-list__head-main">
              <h3>{section.title}</h3>
              <span className="project-list__count">{section.cards.length}</span>
            </span>
            <span className="project-list__toggle-label">
              {expandedSections[collapsibleId] ? '접기' : '펼치기'}
            </span>
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
            className={[
              'project-list__section',
              `project-list__section--${section.id}`,
              collapsibleId && !expandedSections[collapsibleId] ? 'is-collapsed' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {head}
            {isExpanded ? (
              section.cards.length ? (
                <div className="project-list__rows">
                  {section.cards.map((card) => {
                    const showPosition =
                      remainingTotal > 0 &&
                      (section.id === 'unacked' || section.id === 'progress');
                    const position = showPosition
                      ? { index: ++remainingIndex, total: remainingTotal }
                      : undefined;

                    return (
                      <HandoverListRowProject
                        key={card.id}
                        card={card}
                        position={position}
                        searchQuery={searchQuery}
                        staffNames={staffNames}
                        onOpen={() => onOpenCard(card)}
                        onOpenComments={() => onOpenCardComments(card)}
                        onAddComment={(content) => onAddComment(card.id, content)}
                        staffName={staffName}
                        commentDisabled={commentDisabled}
                        onAcknowledge={() => onAcknowledge(card.id)}
                        onMarkDone={() => onMarkDone(card.id)}
                        onHold={() => onHold(card.id)}
                        onResume={() => onResume(card.id)}
                        onAssignChange={(assigneeName) => onAssignChange(card.id, assigneeName)}
                      />
                    );
                  })}
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
