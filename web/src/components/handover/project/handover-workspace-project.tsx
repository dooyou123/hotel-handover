'use client';

import type { ShiftSummaryData } from '@/lib/handover/shift-summary';
import type { Card, HandoverViewMode, QuickFilter, WorkSession } from '@/lib/handover/types';
import type { HotelEvent } from '@/lib/events/types';
import type { TodayAlertItem } from '@/lib/today/alerts';
import type { Todo } from '@/lib/todos/types';
import { RoomView } from '@/components/handover/room-view';
import { HandoverArchiveProject } from './handover-archive-project';
import { HandoverAsideProject } from './handover-aside-project';
import { HandoverMobilePanel } from './handover-mobile-panel';
import { HandoverListProject } from './handover-list-project';
import { HandoverShiftBriefProject } from './handover-shift-brief-project';
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
  archivedCards: Card[];
  archivedLoading: boolean;
  archivedCount: number;
  archivedSearchCount: number;
  isManager: boolean;
  session: WorkSession;
  onViewModeChange: (mode: HandoverViewMode) => void;
  onSearchChange: (value: string) => void;
  onSearchDateFromChange: (value: string) => void;
  onSearchDateToChange: (value: string) => void;
  onQuickFilterChange: (filter: QuickFilter) => void;
  onAdd: () => void;
  onArchiveDone: () => void;
  onRestoreFromArchive: (cardId: string) => Promise<void>;
  onActivity: () => void;
  onShiftHistory: () => void;
  onOpenShiftBrief: () => void;
  authorLabel: string;
  requireSession: (action: string) => boolean;
  onToast: (message: string) => void;
  onShiftStart: () => void;
  onShiftEnd: () => void;
  onOpenCard: (card: Card) => void;
  onOpenCardComments: (card: Card) => void;
  onAddComment: (cardId: string, content: string) => Promise<void>;
  staffNames: string[];
  staffName: string;
  commentDisabled?: boolean;
  onAcknowledge: (cardId: string) => void | Promise<void>;
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
  archivedCards,
  archivedLoading,
  archivedCount,
  archivedSearchCount,
  isManager,
  session,
  onViewModeChange,
  onSearchChange,
  onSearchDateFromChange,
  onSearchDateToChange,
  onQuickFilterChange,
  onAdd,
  onArchiveDone,
  onRestoreFromArchive,
  onActivity,
  onShiftHistory,
  onOpenShiftBrief,
  authorLabel,
  requireSession,
  onToast,
  onShiftStart,
  onShiftEnd,
  onOpenCard,
  onOpenCardComments,
  onAddComment,
  staffNames,
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
            />
          </div>
          <div className="project-handover__main-body">
            {viewMode === 'brief' ? (
              <HandoverShiftBriefProject
                summary={summaryData}
                todos={todos}
                events={events}
                session={session}
                authorLabel={authorLabel}
                requireSession={requireSession}
                onAcknowledge={onAcknowledge}
                onOpenCard={onOpenCard}
                onOpenTodo={onOpenTodo}
                onOpenEvent={onOpenEvent}
                onShiftHistory={onShiftHistory}
                onActivityLog={onActivity}
                onToast={onToast}
              />
            ) : viewMode === 'archive' ? (
              <HandoverArchiveProject
                cards={archivedCards}
                isLoading={archivedLoading}
                isManager={isManager}
                searchQuery={searchQuery}
                searchDateFrom={searchDateFrom}
                searchDateTo={searchDateTo}
                session={session}
                onOpenCard={onOpenCard}
                onRestore={onRestoreFromArchive}
              />
            ) : viewMode === 'room' ? (
              <RoomView cards={visibleCards} onOpenCard={onOpenCard} />
            ) : (
              <HandoverListProject
                cards={visibleCards}
                searchQuery={searchQuery}
                staffNames={staffNames}
                isManager={isManager}
                onOpenCard={onOpenCard}
                onOpenCardComments={onOpenCardComments}
                onAddComment={onAddComment}
                staffName={staffName}
                commentDisabled={commentDisabled}
                onAcknowledge={onAcknowledge}
                onMarkDone={onMarkDone}
                onHold={onHold}
                onResume={onResume}
                onAssignChange={onAssignChange}
                onSnooze={onSnooze}
                onUnsnooze={onUnsnooze}
                onRecordFirstResponse={onRecordFirstResponse}
                onBulkMarkDone={onBulkMarkDone}
                onBulkHold={onBulkHold}
                onBulkAssign={onBulkAssign}
                onBulkSnooze={onBulkSnooze}
                onBulkUnassign={onBulkUnassign}
                onBulkResume={onBulkResume}
                onBulkArchive={onBulkArchive}
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
          onShiftHistory={onShiftHistory}
          onActivity={onActivity}
          onAlertClick={onAlertClick}
          onOpenCard={onOpenCard}
          onOpenTodo={onOpenTodo}
          onOpenEvent={onOpenEvent}
          onAcknowledge={onAcknowledge}
          onToggleTodo={onToggleTodo}
        />
      </div>

      <HandoverMobilePanel
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
        onShiftHistory={onShiftHistory}
        onActivity={onActivity}
        onAlertClick={onAlertClick}
        onOpenCard={onOpenCard}
        onOpenTodo={onOpenTodo}
        onOpenEvent={onOpenEvent}
        onAcknowledge={onAcknowledge}
        onToggleTodo={onToggleTodo}
        onShowUnacked={onShowUnacked}
      />
    </div>
  );
}
