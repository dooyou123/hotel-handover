'use client';

import type { ShiftSummaryData } from '@/lib/handover/shift-summary';
import type { Card, HandoverViewMode, QuickFilter } from '@/lib/handover/types';
import type { HotelEvent } from '@/lib/events/types';
import type { TodayAlertItem } from '@/lib/today/alerts';
import type { Todo } from '@/lib/todos/types';
import { RoomView } from '@/components/handover/room-view';
import { HandoverAsideProject } from './handover-aside-project';
import { HandoverListProject } from './handover-list-project';
import { HandoverToolbarProject } from './handover-toolbar-project';

type HandoverWorkspaceProjectProps = {
  summaryData: ShiftSummaryData;
  cards: Card[];
  visibleCards: Card[];
  todos: Todo[];
  events: HotelEvent[];
  alerts: TodayAlertItem[];
  viewMode: HandoverViewMode;
  searchQuery: string;
  searchDateFrom: string;
  searchDateTo: string;
  quickFilter: QuickFilter;
  doneCount: number;
  archivedCount: number;
  archivedSearchCount: number;
  isManager: boolean;
  onViewModeChange: (mode: HandoverViewMode) => void;
  onSearchChange: (value: string) => void;
  onSearchDateFromChange: (value: string) => void;
  onSearchDateToChange: (value: string) => void;
  onQuickFilterChange: (filter: QuickFilter) => void;
  onAdd: () => void;
  onArchiveDone: () => void;
  onOpenArchive: () => void;
  onExport: () => void;
  onActivity: () => void;
  onOpenShiftBrief: () => void;
  onShiftStart: () => void;
  onShiftEnd: () => void;
  onOpenCard: (card: Card) => void;
  onAcknowledge: (cardId: string) => void;
  onMarkDone: (cardId: string) => void;
  onShowUnacked: () => void;
  onAlertClick: (id: string) => void;
  onOpenTodo: (todo: Todo) => void;
  onToggleTodo: (todo: Todo) => void;
  onOpenEvent: (event: HotelEvent) => void;
};

export function HandoverWorkspaceProject({
  summaryData,
  cards,
  visibleCards,
  todos,
  events,
  alerts,
  viewMode,
  searchQuery,
  searchDateFrom,
  searchDateTo,
  quickFilter,
  doneCount,
  archivedCount,
  archivedSearchCount,
  isManager,
  onViewModeChange,
  onSearchChange,
  onSearchDateFromChange,
  onSearchDateToChange,
  onQuickFilterChange,
  onAdd,
  onArchiveDone,
  onOpenArchive,
  onExport,
  onActivity,
  onOpenShiftBrief,
  onShiftStart,
  onShiftEnd,
  onOpenCard,
  onAcknowledge,
  onMarkDone,
  onShowUnacked,
  onAlertClick,
  onOpenTodo,
  onToggleTodo,
  onOpenEvent,
}: HandoverWorkspaceProjectProps) {
  return (
    <div className="project-handover">
      <div className="project-handover__split">
        <div className="project-handover__main">
          <div className="project-handover__main-head">
            <HandoverToolbarProject
              viewMode={viewMode}
              quickFilter={quickFilter}
              doneCount={doneCount}
              archivedCount={archivedCount}
              archivedSearchCount={archivedSearchCount}
              isManager={isManager}
              searchQuery={searchQuery}
              searchDateFrom={searchDateFrom}
              searchDateTo={searchDateTo}
              onViewModeChange={onViewModeChange}
              onQuickFilterChange={onQuickFilterChange}
              onSearchChange={onSearchChange}
              onSearchDateFromChange={onSearchDateFromChange}
              onSearchDateToChange={onSearchDateToChange}
              onAdd={onAdd}
              onArchiveDone={onArchiveDone}
              onOpenArchive={onOpenArchive}
            />
          </div>
          <div className="project-handover__main-body">
            {viewMode === 'room' ? (
              <RoomView cards={visibleCards} onOpenCard={onOpenCard} />
            ) : (
              <HandoverListProject
                cards={visibleCards}
                searchQuery={searchQuery}
                onOpenCard={onOpenCard}
                onAcknowledge={onAcknowledge}
                onMarkDone={onMarkDone}
              />
            )}
          </div>
        </div>

        <HandoverAsideProject
          summaryData={summaryData}
          cards={cards}
          todos={todos}
          events={events}
          alerts={alerts}
          quickFilter={quickFilter}
          onQuickFilterChange={onQuickFilterChange}
          onShiftStart={onShiftStart}
          onShiftEnd={onShiftEnd}
          onOpenShiftBrief={onOpenShiftBrief}
          onExport={onExport}
          onActivity={onActivity}
          onAlertClick={onAlertClick}
          onOpenCard={onOpenCard}
          onOpenTodo={onOpenTodo}
          onOpenEvent={onOpenEvent}
          onAcknowledge={onAcknowledge}
          onToggleTodo={onToggleTodo}
        />
      </div>
    </div>
  );
}
