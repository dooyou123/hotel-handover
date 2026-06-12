'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { ReconcileResult } from '@/lib/rate-confirm/compare-engine';
import { buildItemInsertsFromErrors } from '@/lib/rate-confirm/session-payload';
import type {
  RateConfirmItem,
  RateConfirmSession,
  RateConfirmSessionDetail,
  SaveResolutionInput,
} from '@/lib/rate-confirm/history-types';

const sessionsKey = ['rate-confirm-sessions', DEFAULT_HOTEL_ID] as const;

function sessionDetailKey(sessionId: string) {
  return ['rate-confirm-session', sessionId] as const;
}

async function fetchSessions(): Promise<RateConfirmSession[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('rate_confirm_sessions')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as RateConfirmSession[];
}

async function fetchSessionDetail(sessionId: string): Promise<RateConfirmSessionDetail> {
  const supabase = createClient();
  const [sessionRes, itemsRes] = await Promise.all([
    supabase.from('rate_confirm_sessions').select('*').eq('id', sessionId).single(),
    supabase
      .from('rate_confirm_items')
      .select('*')
      .eq('session_id', sessionId)
      .order('ota'),
  ]);
  if (sessionRes.error) throw sessionRes.error;
  if (itemsRes.error) throw itemsRes.error;
  return {
    ...(sessionRes.data as RateConfirmSession),
    items: (itemsRes.data ?? []) as RateConfirmItem[],
  };
}

export function useRateConfirmSessions() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: sessionsKey,
    queryFn: fetchSessions,
  });

  const createSession = useMutation({
    mutationFn: async (input: {
      author: string;
      workGroup: string;
      tlFileName: string;
      pmsFileName: string;
      notes: string;
      result: ReconcileResult;
    }) => {
      const supabase = createClient();
      const { data: session, error: sessionError } = await supabase
        .from('rate_confirm_sessions')
        .insert({
          hotel_id: DEFAULT_HOTEL_ID,
          author: input.author,
          work_group: input.workGroup,
          tl_file_name: input.tlFileName,
          pms_file_name: input.pmsFileName,
          notes: input.notes,
          summary: { ...input.result.summary, matchCount: input.result.matches.length },
        })
        .select('*')
        .single();
      if (sessionError) throw sessionError;

      const itemRows = buildItemInsertsFromErrors(input.result.errors).map((row) => ({
        ...row,
        session_id: session.id,
        hotel_id: DEFAULT_HOTEL_ID,
      }));

      if (itemRows.length) {
        const { error: itemsError } = await supabase.from('rate_confirm_items').insert(itemRows);
        if (itemsError) throw itemsError;
      }

      return fetchSessionDetail(session.id);
    },
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: sessionsKey });
      queryClient.setQueryData(sessionDetailKey(detail.id), detail);
    },
  });

  return { listQuery, createSession };
}

export function useRateConfirmSessionDetail(sessionId: string | null) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: sessionId ? sessionDetailKey(sessionId) : ['rate-confirm-session', 'none'],
    queryFn: () => fetchSessionDetail(sessionId!),
    enabled: Boolean(sessionId),
  });

  const saveResolution = useMutation({
    mutationFn: async ({
      itemId,
      sessionId: sid,
      input,
      author,
      workGroup,
    }: {
      itemId: string;
      sessionId: string;
      input: SaveResolutionInput;
      author: string;
      workGroup: string;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('rate_confirm_items')
        .update({
          resolution_status: input.resolution_status,
          resolution_action: input.resolution_action,
          resolution_note: input.resolution_note.trim(),
          resolved_by: author,
          work_group: workGroup,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select('*')
        .single();
      if (error) throw error;
      return { sessionId: sid, item: data as RateConfirmItem };
    },
    onSuccess: ({ sessionId: sid, item }) => {
      queryClient.setQueryData<RateConfirmSessionDetail | undefined>(
        sessionDetailKey(sid),
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((row) => (row.id === item.id ? item : row)),
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: sessionsKey });
    },
  });

  return { detailQuery, saveResolution };
}
