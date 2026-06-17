import type { HotelEvent } from '@/lib/events/types';
import type { Todo } from '@/lib/todos/types';

export const DONE_TODO_HIDE_AFTER_DAYS = 7;

export function todayDateString(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isDoneTodoHiddenFromList(
  todo: Pick<Todo, 'status' | 'completed_at'>,
  now = new Date(),
): boolean {
  if (todo.status !== 'done') return false;
  if (!todo.completed_at) return false;

  const completed = new Date(todo.completed_at);
  if (Number.isNaN(completed.getTime())) return false;

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - DONE_TODO_HIDE_AFTER_DAYS);
  cutoff.setHours(0, 0, 0, 0);
  return completed.getTime() < cutoff.getTime();
}

export function isPastHotelEvent(
  event: Pick<HotelEvent, 'event_date'>,
  today = todayDateString(),
): boolean {
  return event.event_date < today;
}

export function isCompletedHotelEvent(
  event: Pick<HotelEvent, 'completed_at'>,
): boolean {
  return Boolean(event.completed_at);
}

export function isPastOrCompletedHotelEvent(
  event: Pick<HotelEvent, 'event_date' | 'completed_at'>,
  today = todayDateString(),
): boolean {
  return isPastHotelEvent(event, today) || isCompletedHotelEvent(event);
}
