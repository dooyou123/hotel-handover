'use client';

import { useQuery } from '@tanstack/react-query';
import type { OtaAccountsPayload } from '@/lib/ota-accounts/types';

async function fetchOtaAccountsClient(refresh = false): Promise<OtaAccountsPayload> {
  const url = refresh ? '/api/ota-accounts?refresh=1' : '/api/ota-accounts';
  const response = await fetch(url);
  const data = (await response.json()) as OtaAccountsPayload & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? 'OTA 계정을 불러오지 못했습니다.');
  }
  return data;
}

export function useOtaAccounts() {
  return useQuery({
    queryKey: ['ota-accounts'],
    queryFn: () => fetchOtaAccountsClient(false),
    staleTime: 5 * 60_000,
  });
}

export async function refreshOtaAccounts(): Promise<OtaAccountsPayload> {
  return fetchOtaAccountsClient(true);
}
