'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { Todo, TodoInput } from '@/lib/todos/types';

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
  return (data ?? []) as Todo[];
}

export function useTodos() {
  const queryClient = useQueryClient();
  const queryKey = ['todos', DEFAULT_HOTEL_ID] as const;

  const query = useQuery({ queryKey, queryFn: fetchTodos });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('todos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createTodo = useMutation({
    mutationFn: async (input: TodoInput) => {
      const supabase = createClient();
      const todos = queryClient.getQueryData<Todo[]>(queryKey) ?? [];
      const sortOrder = todos.length ? Math.max(...todos.map((t) => t.sort_order)) + 1 : 0;
      const { data, error } = await supabase
        .from('todos')
        .insert({ ...input, hotel_id: DEFAULT_HOTEL_ID, sort_order: sortOrder })
        .select('*')
        .single();
      if (error) throw error;
      return data as Todo;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateTodo = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: Partial<TodoInput> & {
        status?: Todo['status'];
        completed_at?: string | null;
        linked_card_id?: string | null;
      };
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase.from('todos').update(input).eq('id', id).select('*').single();
      if (error) throw error;
      return data as Todo;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteTodo = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const toggleTodo = useMutation({
    mutationFn: async (todo: Todo) => {
      const supabase = createClient();
      const nextStatus = todo.status === 'done' ? 'open' : 'done';
      const { data, error } = await supabase
        .from('todos')
        .update({
          status: nextStatus,
          completed_at: nextStatus === 'done' ? new Date().toISOString() : null,
        })
        .eq('id', todo.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as Todo;
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
