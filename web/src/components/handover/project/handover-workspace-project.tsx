'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { HandoverRecordsTab } from '@/lib/handover/records';
import { isToday, type ShiftSummaryData } from '@/lib/handover/shift-summary';
import type { Card, HandoverViewMode, QuickFilter, WorkSession } from '@/lib/handover/types';
import type { HotelEvent } from '@/lib/events/types';
import type { TodayAlertItem } from '@/lib/today/alerts';
import type { Todo } from '@/lib/todos/types';
import { RoomView } from '@/components/handover/room-view';
import { buildProjectListSections } from '@/lib/handover/card-utils';
import { HandoverArchiveProject } from './handover-archive-project';
import { HandoverAsideProject } from './handover-aside-project';
import { HandoverMobilePanel } from './handover-mobile-panel';
import { HandoverMobileViewTabs, type HandoverMobileView } from './handover-mobile-view-tabs';
import { HandoverListProject } from './handover-list-project';
import { HandoverListSummary } from './handover-list-summary';
import { HandoverShiftBriefProject } from './handover-shift-brief-project';
import { HandoverToolbarProject } from './handover-toolbar-project';
import type { HandoverStatusTab } from './handover-status-tabs';

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
  onOpenRecords: (tab: HandoverRecordsTab) => void;
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
  onOpenCardById?: (cardId: string) => void;
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
  onOpenRecords,
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
  onOpenCardById,
}: HandoverWorkspaceProjectProps) {
  const isBriefView = viewMode === 'brief';
  const panelViewMode = isBriefView ? 'board' : viewMode;
  const [mobileView, setMobileView] = useState<HandoverMobileView>('list');
  const [listStatusTab, setListStatusTab] = useState<Exclude<HandoverStatusTab, 'archive'>>('progress');
  const mobilePanelBadge = useMemo(
    () => summaryData.unackedUrgent.length + alerts.length,
    [summaryData.unackedUrgent.length, alerts.length],
  );

  const statusCounts = useMemo(() => {
    const sections = buildProjectListSections(visibleCards, staffNames);
    const sectionMap = new Map(sections.map((section) => [section.id, section]));
    const progress = [
      ...(sectionMap.get('unacked')?.cards ?? []),
      ...(sectionMap.get('progress')?.cards ?? []),
    ];
    const hold = sectionMap.get('hold')?.cards ?? [];
    const doneAll = [
      ...(sectionMap.get('done')?.cards ?? []),
      ...(sectionMap.get('archived')?.cards ?? []),
    ];
    const doneToday = doneAll.filter((card) => isToday(card.updated_at || card.created_at));
    return {
      progress: progress.length,
      hold: hold.length,
      done: searchQuery.trim() ? doneAll.length : doneToday.length,
      archive: archivedCount,
    } satisfies Record<HandoverStatusTab, number>;
  }, [visibleCards, staffNames, archivedCount, searchQuery]);

  function handleStatusTabChange(tab: HandoverStatusTab) {
    if (tab === 'archive') {
      onViewModeChange('archive');
      return;
    }
    setListStatusTab(tab);
    onViewModeChange('board');
  }

  useEffect(() => {
    if (!isBriefView) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isBriefView]);

  const briefFullscreen = isBriefView ? (
    <div className="handover-brief-fullscreen" role="dialog" aria-modal="true" aria-label="교대 인계">
      <header className="handover-brief-fullscreen__bar">
        <button
          type="button"
          className="handover-brief-fullscreen__back"
          onClick={() => onViewModeChange('board')}
        >
          ← 인수인계 목록
        </button>
        <p className="handover-brief-fullscreen__title">교대 인계</p>
      </header>
      <div className="handover-brief-fullscreen__body">
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
          onOpenRecords={onOpenRecords}
          onToast={onToast}
        />
      </div>
    </div>
  ) : null;

  return (
    <div className="project-handover">
      {typeof document !== 'undefined' && briefFullscreen
        ? createPortal(briefFullscreen, document.body)
        : null}

      <HandoverMobileViewTabs view={mobileView} panelBadge={mobilePanelBadge} onChange={setMobileView} />

      <div className={`project-handover__split project-handover__split--mobile-${mobileView}`}>
        <div className="project-handover__main">
          <div className="project-handover__main-head">
            <HandoverToolbarProject
              viewMode={viewMode}
              doneCount={doneCount}
              archivedSearchCount={archivedSearchCount}
              isManager={isManager}
              searchQuery={searchQuery}
              searchDateFrom={searchDateFrom}
              searchDateTo={searchDateTo}
              onViewModeChange={onViewModeChange}
              onSearchChange={onSearchChange}
              onSearchDateFromChange={onSearchDateFromChange}
              onSearchDateToChange={onSearchDateToChange}
              onAdd={onAdd}
              onArchiveDone={onArchiveDone}
            />
          </div>
          <div className="project-handover__main-body">
            {panelViewMode === 'archive' ? (
              <HandoverArchiveProject
                cards={archivedCards}
                isLoading={archivedLoading}
                isManager={isManager}
                searchQuery={searchQuery}
                searchDateFrom={searchDateFrom}
                searchDateTo={searchDateTo}
                session={session}
                statusCounts={statusCounts}
                onStatusTabChange={handleStatusTabChange}
                onOpenCard={onOpenCard}
                onRestore={onRestoreFromArchive}
              />
            ) : panelViewMode === 'room' ? (
              <RoomView cards={visibleCards} onOpenCard={onOpenCard} />
            ) : (
              <>
                <HandoverListSummary
                  cards={cards}
                  todos={todos}
                  events={events}
                  staffNames={staffNames}
                  onShowUnacked={onShowUnacked}
                  onOpenCard={onOpenCard}
                  onAcknowledge={onAcknowledge}
                />
                <HandoverListProject
                cards={visibleCards}
                searchQuery={searchQuery}
                quickFilter={quickFilter}
                staffNames={staffNames}
                isManager={isManager}
                archivedCount={archivedCount}
                statusTab={listStatusTab}
                onStatusTabChange={setListStatusTab}
                onOpenArchive={() => onViewModeChange('archive')}
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
              </>
            )}
          </div>
        </div>

        <HandoverAsideProject
          session={session}
          todos={todos}
          onShiftStart={onShiftStart}
          onShiftEnd={onShiftEnd}
          onOpenShiftBrief={onOpenShiftBrief}
          onOpenRecords={onOpenRecords}
          onOpenCardById={onOpenCardById}
          onOpenTodo={onOpenTodo}
          onOpenEvent={onOpenEvent}
          onToggleTodo={onToggleTodo}
        />
      </div>

      <HandoverMobilePanel
        hidden={mobileView === 'panel'}
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
        onOpenRecords={onOpenRecords}
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
