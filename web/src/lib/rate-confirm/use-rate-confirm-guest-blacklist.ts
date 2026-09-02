'use client';

import { useQuery } from '@tanstack/react-query';
import type { RateConfirmGuestBlacklistEntry } from '@/lib/rate-confirm/blacklist-types';

const guestBlacklistKey = ['rate-confirm-guest-blacklist'] as const;

async function fetchGuestBlacklist(): Promise<RateConfirmGuestBlacklistEntry[]> {
  const res = await fetch('/api/rate-confirm/guest/blacklist', { credentials: 'include' });
  const json = (await res.json()) as { entries?: RateConfirmGuestBlacklistEntry[]; error?: string };
  if (!res.ok) throw new Error(json.error || '블랙리스트를 불러오지 못했습니다.');
  return json.entries ?? [];
}

/** 게스트 모드 — 읽기 전용 블랙리스트 */
export function useGuestRateConfirmBlacklist(enabled = true) {
  const listQuery = useQuery({
    queryKey: guestBlacklistKey,
    queryFn: fetchGuestBlacklist,
    enabled,
  });

  return { listQuery };
}
