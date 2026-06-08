export type TodoPriority = 'urgent' | 'normal' | 'low';
export type TodoStatus = 'open' | 'done';

export const TODO_PRIORITY_LABELS: Record<TodoPriority, string> = {
  urgent: '긴급',
  normal: '보통',
  low: '낮음',
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
};

export type TodoFilter = 'all' | 'open' | 'done' | 'mine';
