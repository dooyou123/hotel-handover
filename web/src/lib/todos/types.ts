export type TodoPriority = 'urgent' | 'normal' | 'low';
export type TodoStatus = 'open' | 'done';
export type RecurrenceKind = 'none' | 'daily' | 'weekly' | 'monthly';
export type TodoSeriesScope = 'one' | 'series_open' | 'series_all';

export const TODO_PRIORITY_LABELS: Record<TodoPriority, string> = {
  urgent: '긴급',
  normal: '보통',
  low: '낮음',
};

export const RECURRENCE_KIND_LABELS: Record<RecurrenceKind, string> = {
  none: '반복 없음',
  daily: '매일',
  weekly: '매주',
  monthly: '매월',
};

export type Todo = {
  id: string;
  hotel_id: string;
  title: string;
  description: string;
  due_date: string | null;
  priority: TodoPriority;
  status: TodoStatus;
  assignee_name: string;
  assignee_shift: string;
  author: string;
  completed_at: string | null;
  sort_order: number;
  linked_card_id: string | null;
  recurrence_kind: RecurrenceKind;
  recurrence_interval: number;
  recurrence_series_id: string | null;
  recurrence_ends_on: string | null;
  created_at: string;
  updated_at: string;
};

export type TodoInput = {
  title: string;
  description: string;
  due_date: string | null;
  priority: TodoPriority;
  assignee_name: string;
  assignee_shift: string;
  author: string;
  recurrence_kind?: RecurrenceKind;
  recurrence_interval?: number;
  recurrence_ends_on?: string | null;
};

export type TodoFilter = 'all' | 'open' | 'done' | 'mine';
