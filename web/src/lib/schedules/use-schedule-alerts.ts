'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { useWorkSession } from '@/lib/handover/use-work-session';
import {
  fetchScheduleConfirmAlerts,
  getPinnedScheduleMonth,
  markScheduleBoardRead,
  setPinnedScheduleMonth,
} from '@/lib/schedules/api';

const alertsKey = (staffName: string) =>
  ['schedule-board-confirm-alerts', DEFAULT_HOTEL_ID, staffName] as const;

export function useScheduleConfirmAlerts() {
  const { session } = useWorkSession();
  const staffName = session.name?.trim() ?? '';
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: alertsKey(staffName),
    queryFn: () => fetchScheduleConfirmAlerts(staffName),
    enabled: Boolean(staffName),
    refetchInterval: 60_000,
  });

  const confirm = useMutation({
    mutationFn: (input: { versionId: string; monthKey: string }) =>
      markScheduleBoardRead({
        versionId: input.versionId,
        monthKey: input.monthKey,
        staffName,
        shift: session.group,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: alertsKey(staffName) });
      void queryClient.invalidateQueries({ queryKey: ['schedule-board-reads'] });
    },
  });

  return {
    staffName,
    alerts: staffName ? (query.data ?? []) : [],
    isLoading: query.isLoading,
    confirm,
  };
}

export function usePinnedScheduleMonth() {
  const [pinnedMonth, setPinnedMonthState] = useState<string | null>(null);

  useEffect(() => {
    function sync() {
      setPinnedMonthState(getPinnedScheduleMonth());
    }
    sync();
    window.addEventListener('schedule-board-pin-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('schedule-board-pin-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  function pinMonth(monthKey: string | null) {
    setPinnedScheduleMonth(monthKey);
    setPinnedMonthState(monthKey);
  }

  return { pinnedMonth, pinMonth };
}
