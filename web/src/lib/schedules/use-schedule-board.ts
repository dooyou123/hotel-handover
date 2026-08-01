'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import {
  clearScheduleBoardImage,
  deleteScheduleBoardVersion,
  fetchScheduleBoardImage,
  fetchScheduleBoardReads,
  listActiveStaff,
  listScheduleBoardMonths,
  listScheduleBoardVersions,
  markScheduleBoardRead,
  uploadScheduleBoardImage,
} from '@/lib/schedules/api';

function imageKey(monthKey: string) {
  return ['schedule-board-image', DEFAULT_HOTEL_ID, monthKey] as const;
}

function versionsKey(monthKey: string) {
  return ['schedule-board-versions', DEFAULT_HOTEL_ID, monthKey] as const;
}

function readsKey(monthKey: string) {
  return ['schedule-board-reads', DEFAULT_HOTEL_ID, monthKey] as const;
}

const monthsKey = ['schedule-board-months', DEFAULT_HOTEL_ID] as const;
const staffKey = ['schedule-board-staff', DEFAULT_HOTEL_ID] as const;

export function useScheduleBoardImage(monthKey: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: imageKey(monthKey),
    queryFn: () => fetchScheduleBoardImage(monthKey),
    enabled: Boolean(monthKey),
  });

  const versionsQuery = useQuery({
    queryKey: versionsKey(monthKey),
    queryFn: () => listScheduleBoardVersions(monthKey),
    enabled: Boolean(monthKey),
  });

  const versions = versionsQuery.data ?? [];
  const versionIds = versions.map((v) => v.id);

  const readsQuery = useQuery({
    queryKey: [...readsKey(monthKey), versionIds.join(',')],
    queryFn: () => fetchScheduleBoardReads(versionIds),
    enabled: versionIds.length > 0,
  });

  const monthsQuery = useQuery({
    queryKey: monthsKey,
    queryFn: listScheduleBoardMonths,
  });

  const staffQuery = useQuery({
    queryKey: staffKey,
    queryFn: listActiveStaff,
  });

  function invalidateMonth() {
    void queryClient.invalidateQueries({ queryKey: imageKey(monthKey) });
    void queryClient.invalidateQueries({ queryKey: versionsKey(monthKey) });
    void queryClient.invalidateQueries({ queryKey: readsKey(monthKey) });
    void queryClient.invalidateQueries({ queryKey: monthsKey });
    void queryClient.invalidateQueries({ queryKey: ['schedule-board-confirm-alerts'] });
  }

  const upload = useMutation({
    mutationFn: (input: { file: File; note?: string; uploaderLabel?: string }) =>
      uploadScheduleBoardImage(monthKey, input.file, {
        note: input.note,
        uploaderLabel: input.uploaderLabel,
      }),
    onSuccess: () => invalidateMonth(),
  });

  const clear = useMutation({
    mutationFn: () => clearScheduleBoardImage(monthKey),
    onSuccess: () => {
      queryClient.setQueryData(imageKey(monthKey), null);
      invalidateMonth();
    },
  });

  const deleteVersion = useMutation({
    mutationFn: (versionId: string) => deleteScheduleBoardVersion(monthKey, versionId),
    onSuccess: () => invalidateMonth(),
  });

  const markRead = useMutation({
    mutationFn: (input: { versionId: string; staffName: string; shift?: string }) =>
      markScheduleBoardRead({ ...input, monthKey }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: readsKey(monthKey) });
      void queryClient.invalidateQueries({ queryKey: ['schedule-board-confirm-alerts'] });
    },
  });

  return {
    image: query.data ?? null,
    isLoading: query.isLoading || versionsQuery.isLoading,
    error: query.error ?? versionsQuery.error,
    versions,
    reads: readsQuery.data ?? [],
    months: monthsQuery.data ?? [],
    staffNames: staffQuery.data ?? [],
    upload,
    clear,
    deleteVersion,
    markRead,
  };
}
