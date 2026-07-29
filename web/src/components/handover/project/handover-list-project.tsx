'use client';

import { useEffect, useMemo, useState } from 'react';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { buildProjectListSections, isActiveHandoverCard, isBulkArchivableCard } from '@/lib/handover/card-utils';
import { isToday } from '@/lib/handover/shift-summary';
import type { Card, QuickFilter } from '@/lib/handover/types';
import { HandoverListRowProject } from './handover-list-row-project';
import { HandoverStatusTabs, type HandoverStatusTab } from './handover-status-tabs';

type HandoverListProjectProps = {
  cards: Card[];
  allCards?: Card[];
  searchQuery?: string;
  quickFilter?: QuickFilter;
  staffNames: string[];
  isManager?: boolean;
  archivedCount?: number;
  statusTab?: Exclude<HandoverStatusTab, 'archive'>;
  onStatusTabChange?: (tab: Exclude<HandoverStatusTab, 'archive'>) => void;
  onOpenArchive?: () => void;
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

type ListStatusTab = Exclude<HandoverStatusTab, 'archive'>;
type HandoverSort =
  | 'activity-desc'
  | 'activity-asc'
  | 'created-desc'
  | 'created-asc'
  | 'number-desc'
  | 'number-asc';

const HANDOVER_SORT_OPTIONS: { value: HandoverSort; label: string }[] = [
  { value: 'activity-desc', label: '최근 활동순' },
  { value: 'activity-asc', label: '오래된 활동순' },
  { value: 'created-desc', label: '등록 최신순' },
  { value: 'created-asc', label: '등록 오래된순' },
  { value: 'number-desc', label: '번호 큰순' },
  { value: 'number-asc', label: '번호 작은순' },
];

function cardTime(value: string): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortHandoverCards(cards: Card[], sort: HandoverSort): Card[] {
  return [...cards].sort((a, b) => {
    if (sort === 'activity-desc') {
      return cardTime(b.updated_at || b.created_at) - cardTime(a.updated_at || a.created_at);
    }
    if (sort === 'activity-asc') {
      return cardTime(a.updated_at || a.created_at) - cardTime(b.updated_at || b.created_at);
    }
    if (sort === 'created-desc') return cardTime(b.created_at) - cardTime(a.created_at);
    if (sort === 'created-asc') return cardTime(a.created_at) - cardTime(b.created_at);
    if (sort === 'number-desc') return (b.handover_no ?? -1) - (a.handover_no ?? -1);
    return (a.handover_no ?? Number.MAX_SAFE_INTEGER) - (b.handover_no ?? Number.MAX_SAFE_INTEGER);
  });
}

function isDoneToday(card: Card): boolean {
  return isToday(card.updated_at || card.created_at);
}

export function HandoverListProject({
  cards,
  allCards = cards,
  searchQuery,
  quickFilter = 'all',
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
  archivedCount = 0,
  statusTab: statusTabProp,
  onStatusTabChange,
  onOpenArchive,
}: HandoverListProjectProps) {
  const { confirm } = useConfirmDialog();
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [statusTabState, setStatusTabState] = useState<ListStatusTab>('progress');
  const statusTab = statusTabProp ?? statusTabState;
  const setStatusTab = onStatusTabChange ?? setStatusTabState;
  const [doneShowAll, setDoneShowAll] = useState(false);
  const [sort, setSort] = useState<HandoverSort>('activity-desc');

  const sections = useMemo(() => buildProjectListSections(cards, staffNames), [cards, staffNames]);
  const sectionMap = useMemo(() => {
    const map = new Map(sections.map((section) => [section.id, section]));
    return map;
  }, [sections]);
  const allSections = useMemo(
    () => buildProjectListSections(allCards, staffNames),
    [allCards, staffNames],
  );
  const allSectionMap = useMemo(
    () => new Map(allSections.map((section) => [section.id, section])),
    [allSections],
  );

  const progressCards = useMemo(() => {
    const unacked = sectionMap.get('unacked')?.cards ?? [];
    const progress = sectionMap.get('progress')?.cards ?? [];
    return [...sortHandoverCards(unacked, sort), ...sortHandoverCards(progress, sort)];
  }, [sectionMap, sort]);

  const holdCards = useMemo(
    () => sortHandoverCards(sectionMap.get('hold')?.cards ?? [], sort),
    [sectionMap, sort],
  );
  const doneAllCards = useMemo(() => {
    const done = sectionMap.get('done')?.cards ?? [];
    const archived = sectionMap.get('archived')?.cards ?? [];
    return sortHandoverCards([...done, ...archived], sort);
  }, [sectionMap, sort]);

  const doneTodayCards = useMemo(() => doneAllCards.filter(isDoneToday), [doneAllCards]);
  const doneCards =
    doneShowAll || Boolean(searchQuery?.trim()) ? doneAllCards : doneTodayCards;
  const allProgressCount =
    (allSectionMap.get('unacked')?.cards.length ?? 0) +
    (allSectionMap.get('progress')?.cards.length ?? 0);
  const allHoldCount = allSectionMap.get('hold')?.cards.length ?? 0;
  const allDoneCards = [
    ...(allSectionMap.get('done')?.cards ?? []),
    ...(allSectionMap.get('archived')?.cards ?? []),
  ];
  const allDoneCount =
    doneShowAll || Boolean(searchQuery?.trim())
      ? allDoneCards.length
      : allDoneCards.filter(isDoneToday).length;

  const tabCounts: Record<HandoverStatusTab, number> = {
    progress: progressCards.length,
    hold: holdCards.length,
    done: doneShowAll || Boolean(searchQuery?.trim()) ? doneAllCards.length : doneTodayCards.length,
    archive: archivedCount,
  };

  const activeCards =
    statusTab === 'progress' ? progressCards : statusTab === 'hold' ? holdCards : doneCards;
  const activeTotal =
    statusTab === 'progress' ? allProgressCount : statusTab === 'hold' ? allHoldCount : allDoneCount;

  const selectableCards = useMemo(
    () => activeCards.filter((card) => isActiveHandoverCard(card) || isBulkArchivableCard(card)),
    [activeCards],
  );
  const selectedCards = useMemo(
    () => cards.filter((card) => selectedIds.includes(card.id)),
    [cards, selectedIds],
  );
  const selectedArchivableCount = selectedCards.filter(isBulkArchivableCard).length;
  const selectedHoldCount = selectedCards.filter((card) => card.column_id === 'hold').length;
  useEffect(() => {
    if (quickFilter === 'hold-long') setStatusTab('hold');
  }, [quickFilter]);

  useEffect(() => {
    function handleReveal(event: Event) {
      const cardId = (event as CustomEvent<{ cardId: string }>).detail?.cardId;
      if (!cardId) return;
      const target = cards.find((card) => card.id === cardId);
      if (!target) return;
      if (target.column_id === 'hold') setStatusTab('hold');
      else if (target.column_id === 'done') {
        setStatusTab('done');
        if (!isDoneToday(target)) setDoneShowAll(true);
      } else setStatusTab('progress');
    }
    window.addEventListener('handover-reveal-card', handleReveal);
    return () => window.removeEventListener('handover-reveal-card', handleReveal);
  }, [cards]);

  useEffect(() => {
    if (!bulkMode) setSelectedIds([]);
  }, [bulkMode]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => selectableCards.some((card) => card.id === id)));
  }, [selectableCards]);

  useEffect(() => {
    setSelectedIds([]);
    setBulkMode(false);
  }, [statusTab]);

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

  if (!allCards.length) {
    return (
      <div className="project-list">
        <HandoverStatusTabs
          active={statusTab}
          counts={tabCounts}
          onChange={(tab) => {
            if (tab === 'archive') {
              onOpenArchive?.();
              return;
            }
            setStatusTab(tab);
          }}
        />
        <p className="project-list__empty">표시할 인수인계가 없습니다.</p>
      </div>
    );
  }

  const emptyMessage =
    statusTab === 'progress'
      ? '진행 중인 인수인계가 없습니다.'
      : statusTab === 'hold'
        ? '보류 중인 인수인계가 없습니다.'
        : doneShowAll || searchQuery?.trim()
          ? '완료된 인수인계가 없습니다.'
          : '오늘 완료한 항목이 없습니다.';

  return (
    <div className="project-list">
      <HandoverStatusTabs
        active={statusTab}
        counts={tabCounts}
        onChange={(tab) => {
          if (tab === 'archive') {
            onOpenArchive?.();
            return;
          }
          setStatusTab(tab);
        }}
        actions={
          <>
            <span className="project-list__total" aria-live="polite">
              {activeCards.length === activeTotal
                ? `총 ${activeTotal}건`
                : `전체 ${activeTotal}건 중 ${activeCards.length}건`}
            </span>
            <label className="project-list__sort">
              <span>정렬</span>
              <select
                value={sort}
                aria-label="인수인계 정렬"
                onChange={(event) => setSort(event.target.value as HandoverSort)}
              >
                {HANDOVER_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {statusTab === 'done' && !searchQuery?.trim() ? (
              <button
                type="button"
                className={`project-list__done-range${doneShowAll ? ' is-active' : ''}`}
                onClick={() => setDoneShowAll((prev) => !prev)}
              >
                {doneShowAll ? '오늘만 보기' : `전체 완료 (${doneAllCards.length})`}
              </button>
            ) : null}
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
          </>
        }
      />

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

      <section
        className={`project-list__section project-list__section--${statusTab} project-list__section--tabbed`}
        role="tabpanel"
      >
        {activeCards.length ? (
          <div className="project-list__rows">
            {activeCards.map((card) => {
              const selectable = isActiveHandoverCard(card) || isBulkArchivableCard(card);

              return (
                <HandoverListRowProject
                  key={card.id}
                  card={card}
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
          <p className="project-list__section-empty">{emptyMessage}</p>
        )}
      </section>
    </div>
  );
}
