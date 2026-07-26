'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  dayOffAdminAction,
  dayOffClear,
  dayOffSave,
  dayOffStatus,
  dayOffUnlock,
  fetchDayOffAdmin,
  fetchDayOffSession,
  fetchDayOffWindow,
  loginDayOffSession,
  logoutDayOffSession,
} from '@/lib/day-off/api';
import type { DayOffDateInput, DayOffBlockedDate } from '@/lib/day-off/types';

const KEY = {
  session: ['day-off', 'session'] as const,
  window: (month: string) => ['day-off', 'window', month] as const,
  admin: (month: string) => ['day-off', 'admin', month] as const,
};

export function useDayOffSession() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: KEY.session,
    queryFn: fetchDayOffSession,
    staleTime: 30_000,
  });

  const login = useMutation({
    mutationFn: (pin: string) => loginDayOffSession(pin),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY.session }),
  });

  const logout = useMutation({
    mutationFn: () => logoutDayOffSession(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY.session }),
  });

  return { session: query, login, logout };
}

export function useDayOffWindow(monthKey: string, enabled: boolean) {
  return useQuery({
    queryKey: KEY.window(monthKey),
    queryFn: () => fetchDayOffWindow(monthKey),
    enabled: enabled && Boolean(monthKey),
  });
}

export function useDayOffRequests(monthKey: string) {
  const queryClient = useQueryClient();

  const status = useMutation({
    mutationFn: (name: string) => dayOffStatus(name, monthKey),
  });

  const unlock = useMutation({
    mutationFn: (input: { name: string; pin: string }) =>
      dayOffUnlock(input.name, input.pin, monthKey),
  });

  const save = useMutation({
    mutationFn: (input: {
      name: string;
      pin: string;
      pinConfirm?: string;
      newPin?: string;
      dates: DayOffDateInput[];
    }) => dayOffSave({ ...input, monthKey }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY.window(monthKey) }),
  });

  const clear = useMutation({
    mutationFn: (input: { name: string; pin: string; date?: string }) =>
      dayOffClear({ ...input, monthKey }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY.window(monthKey) }),
  });

  return { status, unlock, save, clear };
}

export function useDayOffAdmin(monthKey: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: KEY.admin(monthKey),
    queryFn: () => fetchDayOffAdmin(monthKey),
    enabled: Boolean(monthKey),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY.admin(monthKey) });

  const setPassword = useMutation({
    mutationFn: (input: { pin?: string; clear?: boolean }) =>
      dayOffAdminAction({ action: 'setPassword', ...input }),
    onSuccess: invalidate,
  });

  const saveWindow = useMutation({
    mutationFn: (input: {
      month_key: string;
      opens_at: string;
      closes_at: string;
      max_days_per_person: number;
      max_people_per_day: number;
      published: boolean;
      notes?: string;
    }) => dayOffAdminAction({ action: 'saveWindow', ...input }),
    onSuccess: invalidate,
  });

  const setBlockedDates = useMutation({
    mutationFn: (input: { month_key: string; dates: Array<Pick<DayOffBlockedDate, 'date' | 'label'>> }) =>
      dayOffAdminAction({ action: 'setBlockedDates', ...input }),
    onSuccess: invalidate,
  });

  const review = useMutation({
    mutationFn: (input: { request_id: string; decision: 'approve' | 'reject'; memo?: string }) =>
      dayOffAdminAction({ action: input.decision === 'approve' ? 'approve' : 'reject', ...input }),
    onSuccess: invalidate,
  });

  return { query, setPassword, saveWindow, setBlockedDates, review };
}
