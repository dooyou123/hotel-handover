import { todayDateString } from '@/lib/handover/shift-summary';
import type { TodoInput } from '@/lib/todos/types';

export function briefMemoToTodoInput(
  text: string,
  params: { author: string; assigneeName: string; assigneeShift: string },
): TodoInput {
  const trimmed = text.trim();
  const lines = trimmed.split('\n').map((line) => line.trim()).filter(Boolean);
  const title = (lines[0] ?? trimmed).slice(0, 120);
  const description = lines.slice(1).join('\n');

  return {
    title,
    description,
    due_date: todayDateString(),
    priority: 'normal',
    assignee_name: params.assigneeName,
    assignee_shift: params.assigneeShift,
    author: params.author,
  };
}
