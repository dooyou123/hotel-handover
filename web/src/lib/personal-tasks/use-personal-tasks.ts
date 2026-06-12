'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { PersonalTask, PersonalTaskInput } from '@/lib/personal-tasks/types';

function isSchemaMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === '42703' || error.code === '42P01' || error.code === 'PGRST205') return true;
  return /does not exist/i.test(error.message ?? '');
}

async function fetchPersonalTasks(staffName: string): Promise<PersonalTask[]> {
  if (!staffName) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('personal_tasks')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('staff_name', staffName)
    .order('status')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('sort_order')
    .order('created_at', { ascending: false });
  if (error) {
    if (isSchemaMissing(error)) return [];
    throw error;
  }
  return (data ?? []) as PersonalTask[];
}

export function usePersonalTasks(staffName: string) {
  const queryClient = useQueryClient();
  const queryKey = ['personal-tasks', DEFAULT_HOTEL_ID, staffName] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => fetchPersonalTasks(staffName),
    enabled: Boolean(staffName),
  });

  useEffect(() => {
    if (!staffName) return;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    void supabase
      .from('personal_tasks')
      .select('id')
      .limit(1)
      .then(({ error }) => {
        if (!active || isSchemaMissing(error)) return;
        channel = supabase
          .channel(`personal-tasks-${staffName}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'personal_tasks', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
            () => queryClient.invalidateQueries({ queryKey: ['personal-tasks'] }),
          )
          .subscribe();
      });

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient, staffName]);

  const createTask = useMutation({
    mutationFn: async (input: PersonalTaskInput) => {
      const supabase = createClient();
      const existing = queryClient.getQueryData<PersonalTask[]>(queryKey) ?? [];
      const sortOrder = existing.length ? Math.max(...existing.map((t) => t.sort_order)) + 1 : 0;
      const { error } = await supabase.from('personal_tasks').insert({
        hotel_id: DEFAULT_HOTEL_ID,
        staff_name: staffName,
        title: input.title.trim(),
        description: input.description?.trim() ?? '',
        due_date: input.due_date || null,
        sort_order: sortOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<PersonalTaskInput> & { status?: PersonalTask['status'] } }) => {
      const supabase = createClient();
      const payload: Record<string, unknown> = {};
      if (input.title !== undefined) payload.title = input.title.trim();
      if (input.description !== undefined) payload.description = input.description.trim();
      if (input.due_date !== undefined) payload.due_date = input.due_date || null;
      if (input.status !== undefined) {
        payload.status = input.status;
        payload.completed_at = input.status === 'done' ? new Date().toISOString() : null;
      }
      const { error } = await supabase.from('personal_tasks').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('personal_tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const toggleTask = useMutation({
    mutationFn: async (task: PersonalTask) => {
      const next = task.status === 'done' ? 'open' : 'done';
      const supabase = createClient();
      const { error } = await supabase
        .from('personal_tasks')
        .update({
          status: next,
          completed_at: next === 'done' ? new Date().toISOString() : null,
        })
        .eq('id', task.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    schemaMissing: query.isError && isSchemaMissing(query.error),
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
  };
}
