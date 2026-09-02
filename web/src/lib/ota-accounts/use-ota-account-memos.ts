'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchOtaAccountMemos, saveOtaAccountMemo } from '@/lib/ota-accounts/memos-api';

const memosKey = ['ota-account-memos'] as const;

export function useOtaAccountMemos() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: memosKey,
    queryFn: fetchOtaAccountMemos,
    staleTime: 30_000,
  });

  const saveMemo = useMutation({
    mutationFn: saveOtaAccountMemo,
    onSuccess: (row) => {
      queryClient.setQueryData<Record<string, typeof row>>(memosKey, (prev) => ({
        ...(prev ?? {}),
        [row.account_key]: row,
      }));
    },
  });

  return { listQuery, saveMemo };
}
