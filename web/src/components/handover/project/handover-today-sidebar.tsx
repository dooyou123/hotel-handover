'use client';

import Link from 'next/link';
import { WORK_GROUPS, formatWorkGroupLabel } from '@/lib/constants';
import { getTodayLabel } from '@/lib/handover/shift-summary';
import type { Card } from '@/lib/handover/types';
import type { HotelEvent } from '@/lib/events/types';
import type { TodaySchedule } from '@/lib/schedule/use-schedule';
import { filterTodayEvents, filterTodayTodos, isTodoOverdue } from '@/lib/today/alerts';
import { TODO_PRIORITY_LABELS, type Todo } from '@/lib/todos/types';
import { isUnackedUrgentCard } from '@/lib/handover/card-utils';

type HandoverTodaySidebarProps = {
  cards: Card[];
  todos: Todo[];
  events: HotelEvent[];
  schedule: TodaySchedule | undefined;
  onOpenCard: (card: Card) => void;
  onOpenTodo: (todo: Todo) => void;
  onOpenEvent: (event: HotelEvent) => void;
  onAcknowledge: (cardId: string) => void;
  onToggleTodo: (todo: Todo) => void;
  onShowUnacked?: () => void;
  hideUnacked?: boolean;
};

function formatEventTime(start: string | null, end: string | null): string {
  const fmt = (v: string) => v.slice(0, 5);
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return fmt(start);
  return '';
}

function formatDue(todo: Todo): string {
  if (!todo.due_date) return '마감 없음';
  const date = new Date(`${todo.due_date}T00:00:00`);
  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

export function HandoverTodaySidebar({
  cards,
  todos,
  events,
  schedule,
  onOpenCard,
  onOpenTodo,
  onOpenEvent,
  onAcknowledge,
  onToggleTodo,
  onShowUnacked,
  hideUnacked = false,
}: HandoverTodaySidebarProps) {
  const unacked = cards.filter(isUnackedUrgentCard);
  const todayTodos = filterTodayTodos(todos).slice(0, 8);
  const todayEvents = filterTodayEvents(events).slice(0, 6);

  return (
    <section className="handover-today-sidebar aside-card" aria-label="오늘 업무">
      <header className="handover-today-sidebar__head aside-card__head">
        <h3 className="aside-card__title">오늘</h3>
        <p>{getTodayLabel()}</p>
      </header>

      <div className="handover-today-sidebar__panels">
        {!hideUnacked ? (
          <div className="handover-today-sidebar__panel">
            <div className="handover-today-sidebar__panel-head">
              <h4>미확인 긴급</h4>
              {unacked.length ? (
                <button type="button" className="today-dashboard__link" onClick={onShowUnacked}>
                  전체
                </button>
              ) : null}
            </div>
            {unacked.length ? (
              <ul className="today-dashboard__list">
                {unacked.slice(0, 4).map((card) => (
                  <li key={card.id} className="today-dashboard__row today-dashboard__row--urgent">
                    <button type="button" className="today-dashboard__main" onClick={() => onOpenCard(card)}>
                      <span className="today-dashboard__room">{card.room || '—'}</span>
                      <span className="today-dashboard__title">{card.title}</span>
                    </button>
                    <button type="button" className="today-dashboard__action" onClick={() => onAcknowledge(card.id)}>
                      확인
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="today-dashboard__empty">없음</p>
            )}
          </div>
        ) : null}

        <div className="handover-today-sidebar__panel">
          <div className="handover-today-sidebar__panel-head">
            <h4>오늘 할일</h4>
            <Link href="/todos" className="today-dashboard__link">
              할일
            </Link>
          </div>
          {todayTodos.length ? (
            <ul className="today-dashboard__list">
              {todayTodos.map((todo) => (
                <li
                  key={todo.id}
                  className={`today-dashboard__row${isTodoOverdue(todo) ? ' today-dashboard__row--urgent' : ''}`}
                >
                  <button
                    type="button"
                    className="today-dashboard__check"
                    aria-label="완료"
                    onClick={() => onToggleTodo(todo)}
                  />
                  <button type="button" className="today-dashboard__main" onClick={() => onOpenTodo(todo)}>
                    <span className="today-dashboard__title">{todo.title}</span>
                    <span className="today-dashboard__meta">
                      {TODO_PRIORITY_LABELS[todo.priority]} · {formatDue(todo)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="today-dashboard__empty">없음</p>
          )}
        </div>

        <div className="handover-today-sidebar__panel">
          <div className="handover-today-sidebar__panel-head">
            <h4>오늘 일정</h4>
            <Link href="/schedule" className="today-dashboard__link">
              일정
            </Link>
          </div>
          {todayEvents.length ? (
            <ul className="today-dashboard__list">
              {todayEvents.map((event) => (
                <li key={event.id} className="today-dashboard__row">
                  <button type="button" className="today-dashboard__main" onClick={() => onOpenEvent(event)}>
                    <span className="today-dashboard__meta">
                      {event.category}
                      {formatEventTime(event.start_time, event.end_time)
                        ? ` · ${formatEventTime(event.start_time, event.end_time)}`
                        : ''}
                    </span>
                    <span className="today-dashboard__title">{event.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="today-dashboard__empty">없음</p>
          )}
        </div>

        <div className="handover-today-sidebar__panel">
          <div className="handover-today-sidebar__panel-head">
            <h4>오늘 근무</h4>
          </div>
          {schedule ? (
            <ul className="today-dashboard__schedule">
              {WORK_GROUPS.map((group) => (
                <li key={group}>
                  <span>{formatWorkGroupLabel(group)}</span>
                  <span>{schedule.groups[group].length ? schedule.groups[group].join(', ') : '—'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="today-dashboard__empty">불러오는 중…</p>
          )}
        </div>
      </div>
    </section>
  );
}
