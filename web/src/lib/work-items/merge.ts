import type { HotelEvent } from '@/lib/events/types';
import type { Todo } from '@/lib/todos/types';
import { eventOverlapsMonth } from '@/lib/events/event-dates';

export type WorkScheduleItem =
  | { kind: 'todo'; todo: Todo; sortAt: string }
  | { kind: 'event'; event: HotelEvent; sortAt: string };

function todoSortAt(todo: Todo): string {
  const date = todo.due_date ?? '9999-12-31';
  return `${date}T23:59:00`;
}

function eventSortAt(event: HotelEvent): string {
  const time = event.start_time?.slice(0, 5) ?? '00:00';
  return `${event.event_date}T${time}:00`;
}

export function isInMonth(date: string | null, month: string): boolean {
  if (!date) return false;
  return date.startsWith(month);
}

export function mergeWorkScheduleItems(input: {
  todos: Todo[];
  events: HotelEvent[];
  month: string;
  includeUndatedOpenTodos?: boolean;
  /** 기본: 미완료만. 호출 측에서 이미 필터한 목록이면 `(todo) => !todo.due_date` 등으로 덮어쓸 수 있음 */
  includeUndatedTodo?: (todo: Todo) => boolean;
}): WorkScheduleItem[] {
  const { todos, events, month, includeUndatedOpenTodos = true, includeUndatedTodo } = input;
  const items: WorkScheduleItem[] = [];

  for (const todo of todos) {
    if (todo.due_date && isInMonth(todo.due_date, month)) {
      items.push({ kind: 'todo', todo, sortAt: todoSortAt(todo) });
    } else if (
      !todo.due_date &&
      (includeUndatedTodo?.(todo) ?? (includeUndatedOpenTodos && todo.status === 'open'))
    ) {
      items.push({ kind: 'todo', todo, sortAt: todoSortAt(todo) });
    }
  }

  for (const event of events) {
    if (eventOverlapsMonth(event, month)) {
      items.push({ kind: 'event', event, sortAt: eventSortAt(event) });
    }
  }

  return items.sort((a, b) => a.sortAt.localeCompare(b.sortAt) || a.kind.localeCompare(b.kind));
}

export function formatEventTimeRange(start: string | null, end: string | null): string {
  const fmt = (value: string) => value.slice(0, 5);
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return fmt(start);
  return '종일';
}
