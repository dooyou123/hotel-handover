import type { HotelEvent } from '@/lib/events/types';
import type { Todo } from '@/lib/todos/types';
import { getEventEndDate } from '@/lib/events/event-dates';

export const DONE_TODO_HIDE_AFTER_DAYS = 30;

export function todayDateString(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isRecentlyCompleted(
  completedAt: string | null | undefined,
  days = DONE_TODO_HIDE_AFTER_DAYS,
  now = new Date(),
): boolean {
  if (!completedAt) return false;
  const completed = new Date(completedAt);
  if (Number.isNaN(completed.getTime())) return false;

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return completed.getTime() >= cutoff.getTime();
}

export function isDoneTodoHiddenFromList(
  todo: Pick<Todo, 'status' | 'completed_at'>,
  now = new Date(),
): boolean {
  if (todo.status !== 'done') return false;
  if (!todo.completed_at) return false;
  return !isRecentlyCompleted(todo.completed_at, DONE_TODO_HIDE_AFTER_DAYS, now);
}

/** 미완료 탭: 진행 중 + 최근 완료(기본 30일) */
export function matchesTodoOpenFilter(
  todo: Pick<Todo, 'status' | 'completed_at'>,
  now = new Date(),
): boolean {
  if (todo.status === 'open') return true;
  if (todo.status === 'done') return isRecentlyCompleted(todo.completed_at, DONE_TODO_HIDE_AFTER_DAYS, now);
  return false;
}

export function matchesEventOpenFilter(
  event: Pick<HotelEvent, 'completed_at'>,
  now = new Date(),
): boolean {
  if (!event.completed_at) return true;
  return isRecentlyCompleted(event.completed_at, DONE_TODO_HIDE_AFTER_DAYS, now);
}

export function isPastHotelEvent(
  event: Pick<HotelEvent, 'event_date' | 'end_date'>,
  today = todayDateString(),
): boolean {
  return getEventEndDate(event) < today;
}

export function isCompletedHotelEvent(
  event: Pick<HotelEvent, 'completed_at'>,
): boolean {
  return Boolean(event.completed_at);
}

export function isPastOrCompletedHotelEvent(
  event: Pick<HotelEvent, 'event_date' | 'end_date' | 'completed_at'>,
  today = todayDateString(),
): boolean {
  return isPastHotelEvent(event, today) || isCompletedHotelEvent(event);
}
