'use client';

import type { ShiftSummaryData } from '@/lib/handover/shift-summary';
import type { Card, HandoverViewMode, Notice, QuickFilter } from '@/lib/handover/types';
import { RoomView } from '@/components/handover/room-view';
import { HandoverKanbanNova } from './handover-kanban-nova';
import { HandoverNoticesNova } from './handover-notices-nova';
import { HandoverSummaryNova } from './handover-summary-nova';
import { HandoverToolbarNova } from './handover-toolbar-nova';

type HandoverWorkspaceNovaProps = {
  summaryData: ShiftSummaryData;
  cards: Card[];
  visibleCards: Card[];
  notices: Notice[];
  viewMode: HandoverViewMode;
  searchQuery: string;
  quickFilter: QuickFilter;
  doneCount: number;
  archivedCount: number;
  archivedSearchCount: number;
  isManager: boolean;
  onViewModeChange: (mode: HandoverViewMode) => void;
  onSearchChange: (value: string) => void;
  onQuickFilterChange: (filter: QuickFilter) => void;
  onAdd: () => void;
  onArchiveDone: () => void;
  onOpenArchive: () => void;
  onExport: () => void;
  onActivity: () => void;
  onOpenShiftBrief: () => void;
  onShiftStart: () => void;
  onShiftEnd: () => void;
  onMove: (cardId: string, columnId: Card['column_id'], orderedIds: string[]) => Promise<void>;
  onOpenCard: (card: Card) => void;
  onAcknowledge: (cardId: string) => void;
  onShowUnacked: () => void;
};

export function HandoverWorkspaceNova({
  summaryData,
  cards,
  visibleCards,
  notices,
  viewMode,
  searchQuery,
  quickFilter,
  doneCount,
  archivedCount,
  archivedSearchCount,
  isManager,
  onViewModeChange,
  onSearchChange,
  onQuickFilterChange,
  onAdd,
  onArchiveDone,
  onOpenArchive,
  onExport,
  onActivity,
  onOpenShiftBrief,
  onShiftStart,
  onShiftEnd,
  onMove,
  onOpenCard,
  onAcknowledge,
  onShowUnacked,
}: HandoverWorkspaceNovaProps) {
  const unackedCount = summaryData.unackedUrgent.length;

  return (
    <div className="nova-handover">
      <div className="nova-handover__head">
        <HandoverSummaryNova
          data={summaryData}
          totalCount={cards.length}
          activeFilter={quickFilter}
          onFilterSelect={onQuickFilterChange}
        />
        <HandoverNoticesNova notices={notices} />
        {unackedCount > 0 ? (
          <button
            type="button"
            className={`nova-handover__alert${quickFilter === 'unacked' ? ' is-active' : ''}`}
            onClick={onShowUnacked}
          >
            미확인 긴급 <strong key={unackedCount}>{unackedCount}</strong>건 — 지금 확인
          </button>
        ) : null}
        <HandoverToolbarNova
          viewMode={viewMode}
          searchQuery={searchQuery}
          quickFilter={quickFilter}
          doneCount={doneCount}
          archivedCount={archivedCount}
          archivedSearchCount={archivedSearchCount}
          isManager={isManager}
          onViewModeChange={onViewModeChange}
          onSearchChange={onSearchChange}
          onQuickFilterChange={onQuickFilterChange}
          onAdd={onAdd}
          onArchiveDone={onArchiveDone}
          onOpenArchive={onOpenArchive}
          onExport={onExport}
          onActivity={onActivity}
          onOpenShiftBrief={onOpenShiftBrief}
          onShiftStart={onShiftStart}
          onShiftEnd={onShiftEnd}
        />
      </div>

      <div className="nova-handover__board">
        {viewMode === 'board' ? (
          <HandoverKanbanNova
            cards={visibleCards}
            searchQuery={searchQuery}
            onMove={onMove}
            onOpenCard={onOpenCard}
            onAcknowledge={onAcknowledge}
          />
        ) : (
          <RoomView cards={visibleCards} onOpenCard={onOpenCard} />
        )}
      </div>
    </div>
  );
}
