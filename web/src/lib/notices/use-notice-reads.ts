'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { fetchNoticeReads, type NoticeRead } from '@/lib/notices/reads';

export function useNoticeReads(noticeIds: string[]) {
  const sortedIds = [...noticeIds].sort().join(',');

  return useQuery({
    queryKey: ['notice-reads', DEFAULT_HOTEL_ID, sortedIds],
    queryFn: () => fetchNoticeReads(noticeIds),
    enabled: noticeIds.length > 0,
    staleTime: 15_000,
  });
}

export function useInvalidateNoticeReads() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['notice-reads', DEFAULT_HOTEL_ID] });
  };
}

export type { NoticeRead };
