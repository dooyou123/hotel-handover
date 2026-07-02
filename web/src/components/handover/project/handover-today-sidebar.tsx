'use client';

import Link from 'next/link';
import { buildWorkHubHref } from '@/lib/work/work-hub';
import { useMemo } from 'react';
import { getTodayLabel } from '@/lib/handover/shift-summary';
import type { Card } from '@/lib/handover/types';
import type { HotelEvent } from '@/lib/events/types';
import { filterTodayEvents, filterTodayTodos, isTodoOverdue } from '@/lib/today/alerts';
import { describeRecurrence } from '@/lib/todos/recurrence';
import { TODO_PRIORITY_LABELS, type Todo } from '@/lib/todos/types';
import { isUnackedUrgentCard } from '@/lib/handover/card-utils';
import { isPickupImminent } from '@/lib/taxi/format';
import { useTodayTaxiBookings } from '@/lib/transport/use-transport';
import { transportStatusLabel } from '@/lib/transport/types';
import { formatEventTimeRange, mergeWorkScheduleItems } from '@/lib/work-items/merge';

type HandoverTodaySidebarProps = {
  cards: Card[];
  todos: Todo[];
  events: HotelEvent[];
  onOpenCard: (card: Card) => void;
  onOpenTodo: (todo: Todo) => void;
  onOpenEvent: (event: HotelEvent) => void;
  onAcknowledge: (cardId: string) => void;
  onToggleTodo: (todo: Todo) => void;
  onShowUnacked?: () => void;
  hideUnacked?: boolean;
};

function formatDue(todo: Todo): string {
  if (!todo.due_date) return '마감 없음';
  const date = new Date(`${todo.due_date}T00:00:00`);
  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

export function HandoverTodaySidebar({
  cards,
  todos,
  events,
  onOpenCard,
  onOpenTodo,
  onOpenEvent,
  onAcknowledge,
  onToggleTodo,
  onShowUnacked,
  hideUnacked = false,
}: HandoverTodaySidebarProps) {
  const unacked = cards.filter((card) => isUnackedUrgentCard(card));
  const todayMonth = new Date().toISOString().slice(0, 7);
  const todayWorkItems = useMemo(
    () =>
      mergeWorkScheduleItems({
        todos: filterTodayTodos(todos).slice(0, 10),
        events: filterTodayEvents(events).slice(0, 10),
        month: todayMonth,
        includeUndatedOpenTodos: true,
      }),
    [todos, events, todayMonth],
  );
  const { data: todayTaxi = [] } = useTodayTaxiBookings();
  const todayTaxiActive = todayTaxi
    .filter((b) => b.status !== 'cancelled')
    .sort((a, b) => a.pickup_time.localeCompare(b.pickup_time))
    .slice(0, 8);

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
                      <span className="today-dashboard__room card-room-badge">{card.room || '—'}</span>
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
            <h4>오늘 업무 일정</h4>
            <Link href={buildWorkHubHref('schedule')} className="today-dashboard__link">
              할일·일정
            </Link>
          </div>
          {todayWorkItems.length ? (
            <ul className="today-dashboard__list">
              {todayWorkItems.map((item) => {
                if (item.kind === 'event') {
                  const event = item.event;
                  return (
                    <li key={`event-${event.id}`} className="today-dashboard__row">
                      <button type="button" className="today-dashboard__main" onClick={() => onOpenEvent(event)}>
                        <span className="today-dashboard__meta">
                          일정 · {event.category}
                          {formatEventTimeRange(event.start_time, event.end_time) !== '종일'
                            ? ` · ${formatEventTimeRange(event.start_time, event.end_time)}`
                            : ''}
                        </span>
                        <span className="today-dashboard__title">{event.title}</span>
                      </button>
                    </li>
                  );
                }

                const todo = item.todo;
                return (
                  <li
                    key={`todo-${todo.id}`}
                    className={`today-dashboard__row${isTodoOverdue(todo) ? ' today-dashboard__row--urgent' : ''}`}
                  >
                    <button
                      type="button"
                      className="today-dashboard__check"
                      aria-label="완료"
                      onClick={() => onToggleTodo(todo)}
                    />
                    <button type="button" className="today-dashboard__main" onClick={() => onOpenTodo(todo)}>
                      <span className="today-dashboard__meta">
                        할일 · {TODO_PRIORITY_LABELS[todo.priority]} · {formatDue(todo)}
                        {describeRecurrence(todo) ? ` · 🔁 ${describeRecurrence(todo)}` : ''}
                      </span>
                      <span className="today-dashboard__title">{todo.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="today-dashboard__empty">없음</p>
          )}
        </div>

        {todayTaxiActive.length ? (
          <div className="handover-today-sidebar__panel handover-today-sidebar__panel--taxi">
            <div className="handover-today-sidebar__panel-head">
              <h4>오늘 택시</h4>
              <Link href="/transport" className="today-dashboard__link">
                택시 예약
              </Link>
            </div>
            <ul className="today-dashboard__list">
              {todayTaxiActive.map((booking) => {
                const guest = booking.booker_name || booking.guest_name;
                const imminent = isPickupImminent(booking);
                return (
                  <li
                    key={booking.id}
                    className={`today-dashboard__row today-dashboard__row--taxi${
                      imminent ? ' today-dashboard__row--urgent' : ''
                    }${booking.status === 'completed' ? ' today-dashboard__row--muted' : ''}`}
                  >
                    <Link href="/transport" className="today-dashboard__main today-dashboard__main--link">
                      <span className="today-dashboard__meta">
                        {booking.pickup_time.slice(0, 5)}
                        {booking.room_number ? ` · ${booking.room_number}호` : ''}
                        {guest ? ` · ${guest}` : ''}
                        {' · '}
                        {transportStatusLabel(booking.status)}
                      </span>
                      <span className="today-dashboard__title">
                        {booking.destination || '목적지 미입력'}
                        {booking.vehicle_type === '점보' ? ' · 점보' : ''}
                        {booking.vehicle_number ? ` · ${booking.vehicle_number}` : ''}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
