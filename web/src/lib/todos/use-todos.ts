'use client';

import { useEffect, useId } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { buildNextRecurringTodoPayload, getSeriesId } from '@/lib/todos/recurrence';
import type { RecurrenceKind, Todo, TodoInput, TodoSeriesScope } from '@/lib/todos/types';

function normalizeTodo(row: Record<string, unknown>): Todo {
  return {
    ...(row as Todo),
    recurrence_kind: (row.recurrence_kind as RecurrenceKind) ?? 'none',
    recurrence_interval: Number(row.recurrence_interval ?? 1) || 1,
    recurrence_series_id: (row.recurrence_series_id as string | null) ?? null,
    recurrence_ends_on: (row.recurrence_ends_on as string | null) ?? null,
  };
}

async function fetchTodos(): Promise<Todo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('status')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('sort_order')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeTodo(row as Record<string, unknown>));
}

function nextSortOrder(todos: Todo[]): number {
  return todos.length ? Math.max(...todos.map((t) => t.sort_order)) + 1 : 0;
}

function seriesPayloadFromInput(input: Partial<TodoInput>) {
  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.assignee_name !== undefined ? { assignee_name: input.assignee_name } : {}),
    ...(input.assignee_shift !== undefined ? { assignee_shift: input.assignee_shift } : {}),
    ...(input.author !== undefined ? { author: input.author } : {}),
    ...(input.recurrence_kind !== undefined ? { recurrence_kind: input.recurrence_kind } : {}),
    ...(input.recurrence_interval !== undefined ? { recurrence_interval: input.recurrence_interval } : {}),
    ...(input.recurrence_ends_on !== undefined ? { recurrence_ends_on: input.recurrence_ends_on } : {}),
  };
}

export type ToggleTodoResult = {
  todo: Todo;
  spawned: Todo | null;
};

export function useTodos() {
  const queryClient = useQueryClient();
  const queryKey = ['todos', DEFAULT_HOTEL_ID] as const;
  const realtimeChannelId = useId();

  const query = useQuery({ queryKey, queryFn: fetchTodos });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`todos-${realtimeChannelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, realtimeChannelId]);

  const createTodo = useMutation({
    mutationFn: async (input: TodoInput) => {
      const supabase = createClient();
      const todos = queryClient.getQueryData<Todo[]>(queryKey) ?? [];
      const sortOrder = nextSortOrder(todos);
      const recurrenceKind = input.recurrence_kind ?? 'none';
      const payload = {
        title: input.title,
        description: input.description,
        due_date: input.due_date,
        priority: input.priority,
        assignee_name: input.assignee_name,
        assignee_shift: input.assignee_shift,
        author: input.author,
        hotel_id: DEFAULT_HOTEL_ID,
        sort_order: sortOrder,
        recurrence_kind: recurrenceKind,
        recurrence_interval: input.recurrence_interval ?? 1,
        recurrence_ends_on: input.recurrence_ends_on ?? null,
      };

      const { data, error } = await supabase.from('todos').insert(payload).select('*').single();
      if (error) throw error;

      const created = normalizeTodo(data as Record<string, unknown>);
      if (recurrenceKind !== 'none') {
        const { data: linked, error: linkError } = await supabase
          .from('todos')
          .update({ recurrence_series_id: created.id })
          .eq('id', created.id)
          .select('*')
          .single();
        if (linkError) throw linkError;
        return normalizeTodo(linked as Record<string, unknown>);
      }
      return created;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateTodo = useMutation({
    mutationFn: async ({
      id,
      input,
      scope = 'one',
    }: {
      id: string;
      input: Partial<TodoInput> & {
        status?: Todo['status'];
        completed_at?: string | null;
        linked_card_id?: string | null;
        recurrence_series_id?: string | null;
        due_date?: string | null;
      };
      scope?: TodoSeriesScope;
    }) => {
      const supabase = createClient();
      const todos = queryClient.getQueryData<Todo[]>(queryKey) ?? [];
      const current = todos.find((todo) => todo.id === id);
      const seriesId = current ? getSeriesId(current) : null;

      if (scope !== 'one' && seriesId) {
        const shared = seriesPayloadFromInput(input);
        let query = supabase.from('todos').update(shared).eq('hotel_id', DEFAULT_HOTEL_ID);
        query = query.or(`id.eq.${seriesId},recurrence_series_id.eq.${seriesId}`);
        if (scope === 'series_open') {
          query = query.eq('status', 'open');
        }
        const { error: seriesError } = await query;
        if (seriesError) throw seriesError;

        if (input.due_date !== undefined) {
          const { error: dueError } = await supabase.from('todos').update({ due_date: input.due_date }).eq('id', id);
          if (dueError) throw dueError;
        }
      } else {
        const { error } = await supabase.from('todos').update(input).eq('id', id);
        if (error) throw error;
      }

      const { data, error: readError } = await supabase.from('todos').select('*').eq('id', id).single();
      if (readError) throw readError;
      return normalizeTodo(data as Record<string, unknown>);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteTodo = useMutation({
    mutationFn: async ({ id, scope = 'one' }: { id: string; scope?: TodoSeriesScope }) => {
      const supabase = createClient();
      const todos = queryClient.getQueryData<Todo[]>(queryKey) ?? [];
      const current = todos.find((todo) => todo.id === id);
      const seriesId = current ? getSeriesId(current) : null;

      if (scope === 'series_all' && seriesId) {
        const { error } = await supabase
          .from('todos')
          .delete()
          .eq('hotel_id', DEFAULT_HOTEL_ID)
          .or(`id.eq.${seriesId},recurrence_series_id.eq.${seriesId}`);
        if (error) throw error;
        return;
      }

      if (scope === 'series_open' && seriesId) {
        const { error } = await supabase
          .from('todos')
          .delete()
          .eq('hotel_id', DEFAULT_HOTEL_ID)
          .eq('status', 'open')
          .or(`id.eq.${seriesId},recurrence_series_id.eq.${seriesId}`);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const toggleTodo = useMutation({
    mutationFn: async (todo: Todo): Promise<ToggleTodoResult> => {
      const supabase = createClient();
      const todos = queryClient.getQueryData<Todo[]>(queryKey) ?? [];

      if (todo.status === 'done') {
        const { data, error } = await supabase
          .from('todos')
          .update({ status: 'open', completed_at: null })
          .eq('id', todo.id)
          .select('*')
          .single();
        if (error) throw error;
        return { todo: normalizeTodo(data as Record<string, unknown>), spawned: null };
      }

      const { data, error } = await supabase
        .from('todos')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', todo.id)
        .select('*')
        .single();
      if (error) throw error;
      const completed = normalizeTodo(data as Record<string, unknown>);

      const nextPayload = buildNextRecurringTodoPayload(completed, nextSortOrder(todos));
      if (!nextPayload) {
        return { todo: completed, spawned: null };
      }

      const { data: spawnedRow, error: spawnError } = await supabase
        .from('todos')
        .insert(nextPayload)
        .select('*')
        .single();
      if (spawnError) throw spawnError;

      return { todo: completed, spawned: normalizeTodo(spawnedRow as Record<string, unknown>) };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    todos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
  };
}
