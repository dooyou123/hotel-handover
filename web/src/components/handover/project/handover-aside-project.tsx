'use client';

import type { HotelEvent } from '@/lib/events/types';
import type { Todo } from '@/lib/todos/types';
import { PersonalTasksPanel } from '@/components/personal-tasks/personal-tasks-panel';
import { AsideMonthCalendar } from './aside-month-calendar';
import { HandoverTopActions } from './handover-top-actions';

type HandoverAsideProjectProps = {
  todos: Todo[];
  onShiftStart: () => void;
  onShiftEnd: () => void;
  onOpenShiftBrief: () => void;
  onShiftHistory: () => void;
  onActivity: () => void;
  onOpenTodo: (todo: Todo) => void;
  onOpenEvent: (event: HotelEvent) => void;
  onToggleTodo: (todo: Todo) => void;
};

export function HandoverAsideProject({
  todos,
  onShiftStart,
  onShiftEnd,
  onOpenShiftBrief,
  onShiftHistory,
  onActivity,
  onOpenTodo,
  onOpenEvent,
  onToggleTodo,
}: HandoverAsideProjectProps) {
  return (
    <aside className="project-handover__aside" aria-label="업무 사이드바">
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

        <AsideMonthCalendar
          todos={todos}
          onOpenEvent={onOpenEvent}
          onOpenTodo={onOpenTodo}
          onToggleTodo={onToggleTodo}
        />

        <section className="aside-card aside-card--personal-tasks">
          <PersonalTasksPanel variant="aside" />
        </section>
      </div>
    </aside>
  );
}
