'use client';

import type { ShiftSummaryData } from '@/lib/handover/shift-summary';
import type { Card, HandoverViewMode, Notice, QuickFilter } from '@/lib/handover/types';
import type { HotelEvent } from '@/lib/events/types';
import type { TodaySchedule } from '@/lib/schedule/use-schedule';
import type { TodayAlertItem } from '@/lib/today/alerts';
import type { Todo } from '@/lib/todos/types';
import { RoomView } from '@/components/handover/room-view';
import { HandoverNoticesNova } from '@/components/handover/nova/handover-notices-nova';
import { HandoverSummaryNova } from '@/components/handover/nova/handover-summary-nova';
import { HandoverAlertsStrip } from './handover-alerts-strip';
import { HandoverListProject } from './handover-list-project';
import { HandoverTodayDashboard } from './handover-today-dashboard';
import { HandoverToolbarProject } from './handover-toolbar-project';
import { HandoverTopActions } from './handover-top-actions';

type HandoverWorkspaceProjectProps = {
  summaryData: ShiftSummaryData;
  cards: Card[];
  visibleCards: Card[];
  notices: Notice[];
  todos: Todo[];
  events: HotelEvent[];
  schedule: TodaySchedule | undefined;
  alerts: TodayAlertItem[];
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
  notices,
  todos,
  events,
  schedule,
  alerts,
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
  onOpenCard,
  onAcknowledge,
  onMarkDone,
  onShowUnacked,
  onAlertClick,
  onOpenTodo,
  onToggleTodo,
  onOpenEvent,
}: HandoverWorkspaceProjectProps) {
  const unackedCount = summaryData.unackedUrgent.length;

  return (
    <div className="project-handover">
      <div className="project-handover__head">
        <HandoverTopActions
          onShiftStart={onShiftStart}
          onShiftEnd={onShiftEnd}
          onOpenShiftBrief={onOpenShiftBrief}
          onExport={onExport}
          onActivity={onActivity}
        />
        <HandoverSummaryNova
          data={summaryData}
          totalCount={cards.length}
          activeFilter={quickFilter}
          onFilterSelect={onQuickFilterChange}
        />
        <HandoverNoticesNova notices={notices} />
        <HandoverAlertsStrip alerts={alerts} onAlertClick={onAlertClick} />
        {unackedCount > 0 ? (
          <button
            type="button"
            className={`project-handover__alert${quickFilter === 'unacked' ? ' is-active' : ''}`}
            onClick={onShowUnacked}
          >
            미확인 긴급 <strong key={unackedCount}>{unackedCount}</strong>건 — 지금 확인
          </button>
        ) : null}
        <HandoverToolbarProject
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
        />
      </div>

      <div className="project-handover__body">
        {viewMode === 'today' ? (
          <HandoverTodayDashboard
            cards={cards}
            todos={todos}
            events={events}
            schedule={schedule}
            notices={notices}
            onOpenCard={onOpenCard}
            onOpenTodo={onOpenTodo}
            onOpenEvent={onOpenEvent}
            onAcknowledge={onAcknowledge}
            onToggleTodo={onToggleTodo}
            onShowUnacked={onShowUnacked}
          />
        ) : viewMode === 'board' ? (
          <HandoverListProject
            cards={visibleCards}
            searchQuery={searchQuery}
            onOpenCard={onOpenCard}
            onAcknowledge={onAcknowledge}
            onMarkDone={onMarkDone}
          />
        ) : (
          <RoomView cards={visibleCards} onOpenCard={onOpenCard} />
        )}
      </div>
    </div>
  );
}
