import type { RecurrenceKind, Todo } from '@/lib/todos/types';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export type RecurringKind = Exclude<RecurrenceKind, 'none'>;

export function isRecurringKind(kind: RecurrenceKind): kind is RecurringKind {
  return kind === 'daily' || kind === 'weekly' || kind === 'monthly';
}

export function getSeriesId(todo: Pick<Todo, 'id' | 'recurrence_kind' | 'recurrence_series_id'>): string | null {
  if (todo.recurrence_kind === 'none') return null;
  return todo.recurrence_series_id ?? todo.id;
}

export function formatDateYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseYmd(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function addDaysYmd(value: string, days: number): string {
  const { year, month, day } = parseYmd(value);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return formatDateYmd(date);
}

export function nextDailyDueDate(currentDue: string, interval = 1): string {
  return addDaysYmd(currentDue, interval);
}

export function nextWeeklyDueDate(currentDue: string, interval = 1): string {
  return addDaysYmd(currentDue, 7 * interval);
}

export function nextMonthlyDueDate(currentDue: string, interval = 1): string {
  const { year, month, day } = parseYmd(currentDue);
  let nextYear = year;
  let nextMonth = month + interval;
  while (nextMonth > 12) {
    nextMonth -= 12;
    nextYear += 1;
  }
  const lastDay = new Date(nextYear, nextMonth, 0).getDate();
  const nextDay = Math.min(day, lastDay);
  return formatDateYmd(new Date(nextYear, nextMonth - 1, nextDay));
}

export function computeNextDueDate(
  currentDue: string,
  kind: RecurringKind,
  interval = 1,
): string {
  if (kind === 'daily') return nextDailyDueDate(currentDue, interval);
  if (kind === 'weekly') return nextWeeklyDueDate(currentDue, interval);
  return nextMonthlyDueDate(currentDue, interval);
}

export function isRecurrenceEnded(endsOn: string | null, nextDue: string): boolean {
  if (!endsOn) return false;
  return nextDue > endsOn;
}

function advanceToToday(
  nextDue: string,
  kind: RecurringKind,
  interval: number,
  endsOn: string | null,
): string | null {
  const today = formatDateYmd(new Date());
  let cursor = nextDue;
  let guard = 0;
  while (cursor < today && guard < 400) {
    if (isRecurrenceEnded(endsOn, cursor)) return null;
    cursor = computeNextDueDate(cursor, kind, interval);
    guard += 1;
  }
  if (isRecurrenceEnded(endsOn, cursor)) return null;
  return cursor;
}

export function describeRecurrence(
  todo: Pick<Todo, 'recurrence_kind' | 'recurrence_interval' | 'due_date'>,
): string | null {
  if (todo.recurrence_kind === 'none') return null;
  const interval = todo.recurrence_interval ?? 1;
  if (todo.recurrence_kind === 'daily') {
    return interval === 1 ? '매일' : `${interval}일마다`;
  }
  if (!todo.due_date) {
    if (todo.recurrence_kind === 'weekly') return interval === 1 ? '매주' : `${interval}주마다`;
    return interval === 1 ? '매월' : `${interval}개월마다`;
  }
  const { year, month, day } = parseYmd(todo.due_date);
  const weekday = WEEKDAY_LABELS[new Date(year, month - 1, day).getDay()];
  if (todo.recurrence_kind === 'weekly') {
    return interval === 1 ? `매주 ${weekday}요일` : `${interval}주마다 ${weekday}요일`;
  }
  return interval === 1 ? `매월 ${day}일` : `${interval}개월마다 ${day}일`;
}

export function buildNextRecurringTodoPayload(
  todo: Todo,
  sortOrder: number,
): Omit<Todo, 'id' | 'created_at' | 'updated_at' | 'completed_at' | 'status' | 'linked_card_id'> & {
  status: 'open';
  completed_at: null;
  linked_card_id: null;
} | null {
  if (!isRecurringKind(todo.recurrence_kind) || !todo.due_date) return null;

  const interval = todo.recurrence_interval ?? 1;
  let nextDue = computeNextDueDate(todo.due_date, todo.recurrence_kind, interval);
  nextDue = advanceToToday(nextDue, todo.recurrence_kind, interval, todo.recurrence_ends_on) ?? '';
  if (!nextDue || isRecurrenceEnded(todo.recurrence_ends_on, nextDue)) return null;

  return {
    hotel_id: todo.hotel_id,
    title: todo.title,
    description: todo.description,
    due_date: nextDue,
    priority: todo.priority,
    status: 'open',
    assignee_name: todo.assignee_name,
    assignee_shift: todo.assignee_shift,
    author: todo.author,
    completed_at: null,
    sort_order: sortOrder,
    linked_card_id: null,
    recurrence_kind: todo.recurrence_kind,
    recurrence_interval: interval,
    recurrence_series_id: getSeriesId(todo),
    recurrence_ends_on: todo.recurrence_ends_on,
  };
}

export const SERIES_SHARED_FIELDS = [
  'title',
  'description',
  'priority',
  'assignee_name',
  'assignee_shift',
  'author',
  'recurrence_kind',
  'recurrence_interval',
  'recurrence_ends_on',
] as const;
