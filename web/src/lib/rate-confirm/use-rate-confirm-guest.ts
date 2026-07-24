'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReconcileResult } from '@/lib/rate-confirm/compare-engine';
import type {
  RateConfirmItem,
  RateConfirmSession,
  RateConfirmSessionDetail,
  SaveResolutionInput,
} from '@/lib/rate-confirm/history-types';

const guestSessionsKey = ['rate-confirm-guest-sessions'] as const;

function guestSessionDetailKey(sessionId: string) {
  return ['rate-confirm-guest-session', sessionId] as const;
}

async function readJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(json.error || '요청에 실패했습니다.');
  }
  return json;
}

async function fetchGuestSessions(): Promise<RateConfirmSession[]> {
  const res = await fetch('/api/rate-confirm/guest/history', { credentials: 'include' });
  const json = await readJson<{ sessions: RateConfirmSession[] }>(res);
  return json.sessions ?? [];
}

async function fetchGuestSessionDetail(sessionId: string): Promise<RateConfirmSessionDetail> {
  const res = await fetch(`/api/rate-confirm/guest/sessions/${sessionId}`, {
    credentials: 'include',
  });
  return readJson<RateConfirmSessionDetail>(res);
}

export function useGuestRateConfirmSessions(enabled = true) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: guestSessionsKey,
    queryFn: fetchGuestSessions,
    enabled,
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
      const res = await fetch('/api/rate-confirm/guest/sessions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return readJson<RateConfirmSessionDetail>(res);
    },
    onSuccess: (detail) => {
      queryClient.invalidateQueries({ queryKey: guestSessionsKey });
      queryClient.setQueryData(guestSessionDetailKey(detail.id), detail);
    },
  });

  return { listQuery, createSession };
}

export function useGuestRateConfirmSessionDetail(sessionId: string | null, enabled = true) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: sessionId ? guestSessionDetailKey(sessionId) : ['rate-confirm-guest-session', 'none'],
    queryFn: () => fetchGuestSessionDetail(sessionId!),
    enabled: Boolean(sessionId) && enabled,
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
      const res = await fetch(`/api/rate-confirm/guest/items/${itemId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...input,
          author,
          workGroup,
        }),
      });
      const json = await readJson<{ item: RateConfirmItem }>(res);
      return { sessionId: sid, item: json.item };
    },
    onSuccess: ({ sessionId: sid, item }) => {
      queryClient.setQueryData<RateConfirmSessionDetail | undefined>(
        guestSessionDetailKey(sid),
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((row) => (row.id === item.id ? item : row)),
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: guestSessionsKey });
    },
  });

  return { detailQuery, saveResolution };
}
