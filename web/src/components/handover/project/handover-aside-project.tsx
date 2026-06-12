'use client';

import type { ShiftSummaryData } from '@/lib/handover/shift-summary';
import type { QuickFilter, Card } from '@/lib/handover/types';
import type { HotelEvent } from '@/lib/events/types';
import type { TodaySchedule } from '@/lib/schedule/use-schedule';
import type { TodayAlertItem } from '@/lib/today/alerts';
import type { Todo } from '@/lib/todos/types';
import { HandoverSummaryNova } from '@/components/handover/nova/handover-summary-nova';
import { PersonalTasksPanel } from '@/components/personal-tasks/personal-tasks-panel';
import { AsideMonthCalendar } from './aside-month-calendar';
import { HandoverTodaySidebar } from './handover-today-sidebar';
import { HandoverTopActions } from './handover-top-actions';

type HandoverAsideProjectProps = {
  summaryData: ShiftSummaryData;
  cards: Card[];
  todos: Todo[];
  events: HotelEvent[];
  schedule?: TodaySchedule | undefined;
  alerts: TodayAlertItem[];
  quickFilter: QuickFilter;
  onQuickFilterChange: (filter: QuickFilter) => void;
  onShiftStart: () => void;
  onShiftEnd: () => void;
  onOpenShiftBrief: () => void;
  onShiftHistory: () => void;
  onActivity: () => void;
  onAlertClick: (id: string) => void;
  onOpenCard: (card: Card) => void;
  onOpenTodo: (todo: Todo) => void;
  onOpenEvent: (event: HotelEvent) => void;
  onAcknowledge: (cardId: string) => void;
  onToggleTodo: (todo: Todo) => void;
};

export function HandoverAsideProject({
  summaryData,
  cards,
  todos,
  events,
  alerts,
  quickFilter,
  onQuickFilterChange,
  onShiftStart,
  onShiftEnd,
  onOpenShiftBrief,
  onShiftHistory,
  onActivity,
  onAlertClick,
  onOpenCard,
  onOpenTodo,
  onOpenEvent,
  onAcknowledge,
  onToggleTodo,
}: HandoverAsideProjectProps) {
  return (
    <aside className="project-handover__aside" aria-label="오늘 업무">
      <div className="project-handover-aside">
        <section className="aside-card aside-card--shift">
          <div className="aside-card__head">
            <h3 className="aside-card__title">교대 · 기록 보기</h3>
          </div>
          <HandoverTopActions
            layout="grid"
            showHelp
            onShiftStart={onShiftStart}
            onShiftEnd={onShiftEnd}
            onOpenShiftBrief={onOpenShiftBrief}
            onShiftHistory={onShiftHistory}
            onActivity={onActivity}
          />
        </section>

        {alerts.length ? (
          <section className="aside-card aside-card--alerts">
            <div className="aside-card__head">
              <h3 className="aside-card__title">알림</h3>
            </div>
            <div className="aside-alerts">
              {alerts.map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  className={`aside-alerts__item aside-alerts__item--${alert.tone}`}
                  onClick={() => onAlertClick(alert.id)}
                >
                  <strong>{alert.label}</strong>
                  <span>{alert.detail}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <div className="project-handover-aside__today">
          <HandoverTodaySidebar
            cards={cards}
            todos={todos}
            events={events}
            onOpenCard={onOpenCard}
            onOpenTodo={onOpenTodo}
            onOpenEvent={onOpenEvent}
            onAcknowledge={onAcknowledge}
            onToggleTodo={onToggleTodo}
            hideUnacked
          />
        </div>

        <section className="aside-card aside-card--compact">
          <div className="aside-card__head">
            <h3 className="aside-card__title">업무 현황</h3>
          </div>
          <HandoverSummaryNova
            data={summaryData}
            totalCount={cards.length}
            activeFilter={quickFilter}
            onFilterSelect={onQuickFilterChange}
          />
        </section>

        <AsideMonthCalendar todos={todos} onOpenEvent={onOpenEvent} onOpenTodo={onOpenTodo} />

        <section className="aside-card aside-card--personal-tasks">
          <PersonalTasksPanel variant="aside" />
        </section>
      </div>
    </aside>
  );
}
