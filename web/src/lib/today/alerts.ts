import { isCardDueSoon, isCardOverdue } from '@/lib/handover/card-utils';
import { isToday } from '@/lib/handover/shift-summary';
import type { Card } from '@/lib/handover/types';
import type { HotelEvent } from '@/lib/events/types';
import type { Todo } from '@/lib/todos/types';
import type { TransportBooking } from '@/lib/transport/types';

export type TodayAlertItem = {
  id: string;
  label: string;
  detail: string;
  tone: 'urgent' | 'warn' | 'info';
};

export function isTodoOverdue(todo: Todo): boolean {
  if (!todo.due_date || todo.status === 'done') return false;
  const due = new Date(`${todo.due_date}T23:59:59`);
  return due.getTime() < Date.now();
}

export function isTodoDueToday(todo: Todo): boolean {
  if (!todo.due_date || todo.status === 'done') return false;
  return isToday(`${todo.due_date}T12:00:00`);
}

export function buildTodayAlerts(input: {
  unackedUrgent: Card[];
  cards?: Card[];
  todos: Todo[];
  events: HotelEvent[];
}): TodayAlertItem[] {
  const alerts: TodayAlertItem[] = [];
  const overdueTodos = input.todos.filter(isTodoOverdue);
  const dueTodayTodos = input.todos.filter((t) => isTodoDueToday(t) && !isTodoOverdue(t));
  const todayVipEvents = input.events.filter((e) => isToday(`${e.event_date}T12:00:00`) && e.category === 'VIP');
  const activeCards = input.cards ?? [];
  const overdueCards = activeCards.filter(isCardOverdue);
  const dueSoonCards = activeCards.filter((c) => isCardDueSoon(c) && !isCardOverdue(c));

  if (input.unackedUrgent.length) {
    alerts.push({
      id: 'unacked',
      label: '미확인 긴급',
      detail: `${input.unackedUrgent.length}건`,
      tone: 'urgent',
    });
  }
  if (overdueCards.length) {
    alerts.push({
      id: 'due-overdue-cards',
      label: '마감 지난 인계',
      detail: `${overdueCards.length}건`,
      tone: 'urgent',
    });
  }
  if (dueSoonCards.length) {
    alerts.push({
      id: 'due-soon-cards',
      label: '1시간 내 마감',
      detail: `${dueSoonCards.length}건`,
      tone: 'warn',
    });
  }
  if (overdueTodos.length) {
    alerts.push({
      id: 'overdue-todos',
      label: '마감 지난 할일',
      detail: `${overdueTodos.length}건`,
      tone: 'urgent',
    });
  }
  if (dueTodayTodos.length) {
    alerts.push({
      id: 'due-today-todos',
      label: '오늘 마감 할일',
      detail: `${dueTodayTodos.length}건`,
      tone: 'warn',
    });
  }
  if (todayVipEvents.length) {
    alerts.push({
      id: 'vip-events',
      label: '오늘 VIP 일정',
      detail: `${todayVipEvents.length}건`,
      tone: 'warn',
    });
  }

  return alerts;
}

export function filterTodayTodos(todos: Todo[]): Todo[] {
  return todos.filter((t) => t.status === 'open' && (isTodoDueToday(t) || isTodoOverdue(t) || !t.due_date));
}

export function filterTodayEvents(events: HotelEvent[]): HotelEvent[] {
  return events.filter((e) => isToday(`${e.event_date}T12:00:00`));
}

/** 오늘 픽업·미완료(취소 제외) 택시 예약 — 인계·사이드바 공통 */
export function filterPendingTodayTaxi(bookings: TransportBooking[]): TransportBooking[] {
  return bookings
    .filter((b) => b.status === 'pending')
    .sort((a, b) => a.pickup_time.localeCompare(b.pickup_time));
}
