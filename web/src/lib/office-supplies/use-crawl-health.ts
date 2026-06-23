'use client';

import { useQuery } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { normalizeOfficeSupplyCrawlHealth, type OfficeSupplyCrawlHealth } from '@/lib/office-supplies/types';
import { createClient } from '@/lib/supabase/client';

export function officeSupplyCrawlHealthQueryKey() {
  return ['office-supply-crawl-health', DEFAULT_HOTEL_ID] as const;
}

async function fetchOfficeSupplyCrawlHealth(): Promise<OfficeSupplyCrawlHealth | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('office_supply_crawl_health')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return normalizeOfficeSupplyCrawlHealth(data as Record<string, unknown>);
}

export function useOfficeSupplyCrawlHealth() {
  return useQuery({
    queryKey: officeSupplyCrawlHealthQueryKey(),
    queryFn: fetchOfficeSupplyCrawlHealth,
    staleTime: 60_000,
  });
}

export async function runLiveOfficeSupplyCrawlHealthCheck(): Promise<OfficeSupplyCrawlHealth> {
  const response = await fetch('/api/office-supplies/health?live=1');
  const payload = (await response.json()) as { health?: OfficeSupplyCrawlHealth; error?: string };
  if (!response.ok || !payload.health) {
    throw new Error(payload.error ?? '연동 상태 확인에 실패했습니다.');
  }
  return payload.health;
}
