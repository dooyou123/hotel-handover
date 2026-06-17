'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { buildProjectListSections, isActiveHandoverCard, isBulkArchivableCard } from '@/lib/handover/card-utils';
import type { Card } from '@/lib/handover/types';
import { HandoverListRowProject } from './handover-list-row-project';

type HandoverListProjectProps = {
  cards: Card[];
  searchQuery?: string;
  staffNames: string[];
  isManager?: boolean;
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
  onSnooze: (cardId: string) => void;
  onUnsnooze: (cardId: string) => void;
  onRecordFirstResponse: (cardId: string) => void;
  onBulkMarkDone: (cardIds: string[]) => Promise<void>;
  onBulkHold: (cardIds: string[]) => Promise<void>;
  onBulkAssign: (cardIds: string[], assigneeName: string) => Promise<void>;
  onBulkSnooze: (cardIds: string[]) => Promise<void>;
  onBulkUnassign: (cardIds: string[]) => Promise<void>;
  onBulkResume: (cardIds: string[]) => Promise<void>;
  onBulkArchive: (cardIds: string[]) => Promise<void>;
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
  onSnooze,
  onUnsnooze,
  onRecordFirstResponse,
  onBulkMarkDone,
  onBulkHold,
  onBulkAssign,
  onBulkSnooze,
  onBulkUnassign,
  onBulkResume,
  onBulkArchive,
  isManager = false,
}: HandoverListProjectProps) {
  const { confirm } = useConfirmDialog();
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<CollapsibleSectionId, boolean>>({
    done: false,
    hold: false,
  });
  const doneSectionRef = useRef<HTMLElement>(null);
  const scrollDoneOnExpandRef = useRef(false);
  const sections = useMemo(() => buildProjectListSections(cards), [cards]);
  const selectableCards = useMemo(
    () => cards.filter((card) => isActiveHandoverCard(card) || isBulkArchivableCard(card)),
    [cards],
  );
  const selectedCards = useMemo(
    () => cards.filter((card) => selectedIds.includes(card.id)),
    [cards, selectedIds],
  );
  const selectedArchivableCount = selectedCards.filter(isBulkArchivableCard).length;
  const selectedHoldCount = selectedCards.filter((card) => card.column_id === 'hold').length;
  const remainingTotal = useMemo(
    () =>
      sections
        .filter((section) => section.id === 'unacked' || section.id === 'progress')
        .reduce((sum, section) => sum + section.cards.length, 0),
    [sections],
  );
  let remainingIndex = 0;

  useEffect(() => {
    if (!bulkMode) setSelectedIds([]);
  }, [bulkMode]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => selectableCards.some((card) => card.id === id)));
  }, [selectableCards]);

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

  function toggleCardSelection(cardId: string) {
    setSelectedIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId],
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === selectableCards.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(selectableCards.map((card) => card.id));
  }

  async function runBulkMarkDone() {
    if (!selectedIds.length) return;
    const ok = await confirm({
      title: '일괄 완료',
      message: `선택한 ${selectedIds.length}건을 완료 처리할까요?`,
      confirmLabel: '완료',
      tone: 'warning',
    });
    if (!ok) return;
    await onBulkMarkDone(selectedIds);
    setSelectedIds([]);
    setBulkMode(false);
  }

  async function runBulkHold() {
    if (!selectedIds.length) return;
    const ok = await confirm({
      title: '일괄 보류',
      message: `선택한 ${selectedIds.length}건을 보류함으로 옮길까요?`,
      confirmLabel: '보류',
      tone: 'warning',
    });
    if (!ok) return;
    await onBulkHold(selectedIds);
    setSelectedIds([]);
    setBulkMode(false);
  }

  async function runBulkAssign() {
    if (!selectedIds.length) return;
    await onBulkAssign(selectedIds, bulkAssignee);
    setSelectedIds([]);
    setBulkMode(false);
    setBulkAssignee('');
  }

  async function runBulkUnassign() {
    if (!selectedIds.length) return;
    const ok = await confirm({
      title: '일괄 담당 해제',
      message: `선택한 ${selectedIds.length}건의 담당을 해제할까요?`,
      confirmLabel: '해제',
      tone: 'warning',
    });
    if (!ok) return;
    await onBulkUnassign(selectedIds);
    setSelectedIds([]);
    setBulkMode(false);
  }

  async function runBulkSnooze() {
    if (!selectedIds.length) return;
    const ok = await confirm({
      title: '일괄 알림 끔',
      message: `선택한 ${selectedIds.length}건을 2시간 동안 마감 알림에서 제외할까요?`,
      confirmLabel: '알림 끔',
      tone: 'default',
    });
    if (!ok) return;
    await onBulkSnooze(selectedIds);
    setSelectedIds([]);
    setBulkMode(false);
  }

  async function runBulkResume() {
    if (!selectedHoldCount) return;
    const ok = await confirm({
      title: '일괄 재개',
      message: `선택한 보류 ${selectedHoldCount}건을 진행중으로 옮길까요?`,
      confirmLabel: '재개',
      tone: 'warning',
    });
    if (!ok) return;
    await onBulkResume(selectedIds);
    setSelectedIds([]);
    setBulkMode(false);
  }

  async function runBulkArchive() {
    if (!selectedArchivableCount) return;
    const ok = await confirm({
      title: '일괄 보관',
      message: `선택한 완료 ${selectedArchivableCount}건을 보관함으로 옮길까요?`,
      detail: '보드에서는 숨겨지지만 삭제되지 않습니다.',
      confirmLabel: '보관',
      tone: 'default',
    });
    if (!ok) return;
    const archivableIds = selectedCards.filter(isBulkArchivableCard).map((card) => card.id);
    await onBulkArchive(archivableIds);
    setSelectedIds([]);
    setBulkMode(false);
  }

  if (!cards.length) {
    return <p className="project-list__empty">표시할 인수인계가 없습니다.</p>;
  }

  return (
    <div className="project-list">
      <div className="project-list__bulk-head">
        <button
          type="button"
          className={`project-list__bulk-toggle${bulkMode ? ' is-active' : ''}`}
          onClick={() => setBulkMode((prev) => !prev)}
        >
          {bulkMode ? '선택 취소' : '선택'}
        </button>
        {bulkMode ? (
          <button type="button" className="project-list__bulk-toggle" onClick={toggleSelectAll}>
            {selectedIds.length === selectableCards.length && selectableCards.length > 0
              ? '전체 해제'
              : '전체 선택'}
          </button>
        ) : null}
      </div>

      {bulkMode && selectedIds.length ? (
        <div className="project-list__bulk-bar" role="toolbar" aria-label="일괄 작업">
          <span className="project-list__bulk-count">{selectedIds.length}건 선택</span>
          {staffNames.length ? (
            <select
              className="project-list__bulk-assign"
              aria-label="일괄 담당 변경"
              value={bulkAssignee}
              onChange={(event) => setBulkAssignee(event.target.value)}
            >
              <option value="">담당 없음</option>
              {staffNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : null}
          <button type="button" className="project-list__bulk-btn" onClick={() => void runBulkAssign()}>
            담당 적용
          </button>
          <button type="button" className="project-list__bulk-btn" onClick={() => void runBulkUnassign()}>
            담당 해제
          </button>
          <button type="button" className="project-list__bulk-btn" onClick={() => void runBulkSnooze()}>
            2h 알림 끔
          </button>
          {selectedHoldCount ? (
            <button type="button" className="project-list__bulk-btn" onClick={() => void runBulkResume()}>
              재개
            </button>
          ) : null}
          <button type="button" className="project-list__bulk-btn" onClick={() => void runBulkHold()}>
            보류
          </button>
          <button
            type="button"
            className="project-list__bulk-btn project-list__bulk-btn--primary"
            onClick={() => void runBulkMarkDone()}
          >
            완료
          </button>
          {isManager && selectedArchivableCount ? (
            <button type="button" className="project-list__bulk-btn" onClick={() => void runBulkArchive()}>
              보관
            </button>
          ) : null}
        </div>
      ) : null}

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
                    const selectable = isActiveHandoverCard(card) || isBulkArchivableCard(card);

                    return (
                      <HandoverListRowProject
                        key={card.id}
                        card={card}
                        position={position}
                        searchQuery={searchQuery}
                        staffNames={staffNames}
                        bulkMode={bulkMode && selectable}
                        selected={selectedIds.includes(card.id)}
                        onToggleSelect={() => toggleCardSelection(card.id)}
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
                        onSnooze={() => onSnooze(card.id)}
                        onUnsnooze={() => onUnsnooze(card.id)}
                        onRecordFirstResponse={() => onRecordFirstResponse(card.id)}
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
