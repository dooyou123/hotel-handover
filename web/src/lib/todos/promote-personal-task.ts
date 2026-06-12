import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { PersonalTask } from '@/lib/personal-tasks/types';
import type { Todo, TodoInput, TodoPriority } from '@/lib/todos/types';

export async function promotePersonalTaskToTeamTodo(
  task: PersonalTask,
  input: {
    author: string;
    assignee_name: string;
    assignee_shift: string;
    priority: TodoPriority;
    due_date: string | null;
    description?: string;
    markPersonalDone?: boolean;
  },
): Promise<Todo> {
  const supabase = createClient();

  const { data: existingTodos } = await supabase
    .from('todos')
    .select('sort_order')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('sort_order', { ascending: false })
    .limit(1);
  const sortOrder = existingTodos?.[0]?.sort_order != null ? Number(existingTodos[0].sort_order) + 1 : 0;

  const todoPayload: TodoInput = {
    title: task.title,
    description: input.description?.trim() || task.description?.trim() || '',
    due_date: input.due_date ?? task.due_date,
    priority: input.priority,
    assignee_name: input.assignee_name,
    assignee_shift: input.assignee_shift,
    author: input.author,
    recurrence_kind: 'none',
  };

  const { data: created, error } = await supabase
    .from('todos')
    .insert({
      ...todoPayload,
      hotel_id: DEFAULT_HOTEL_ID,
      sort_order: sortOrder,
      recurrence_kind: 'none',
      recurrence_interval: 1,
    })
    .select('*')
    .single();
  if (error) throw error;

  if (input.markPersonalDone !== false) {
    const { error: personalError } = await supabase
      .from('personal_tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', task.id);
    if (personalError) throw personalError;
  }

  return created as Todo;
}
