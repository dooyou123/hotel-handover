'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createLeaveRecord,
  createOvertimeRecord,
  deleteLeaveRecord,
  deleteOvertimeRecord,
  fetchLeaveRecords,
  fetchOvertimeRecords,
  updateLeaveRecord,
  updateOvertimeRecord,
} from '@/lib/schedules/work-records-api';
import type { LeaveRecordInput, OvertimeRecordInput } from '@/lib/schedules/work-records-types';

function overtimeKey(monthKey: string) {
  return ['schedule-overtime-records', monthKey] as const;
}

function leaveKey(monthKey: string) {
  return ['schedule-leave-records', monthKey] as const;
}

export function useScheduleOvertimeRecords(monthKey: string, enabled = true) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: overtimeKey(monthKey),
    queryFn: () => fetchOvertimeRecords(monthKey),
    enabled,
  });

  const addRecord = useMutation({
    mutationFn: (input: { data: OvertimeRecordInput; recordedBy: string }) =>
      createOvertimeRecord(monthKey, input.data, input.recordedBy),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: overtimeKey(monthKey) }),
  });

  const editRecord = useMutation({
    mutationFn: (input: { id: string; data: Partial<OvertimeRecordInput> }) =>
      updateOvertimeRecord(input.id, input.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: overtimeKey(monthKey) }),
  });

  const removeRecord = useMutation({
    mutationFn: deleteOvertimeRecord,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: overtimeKey(monthKey) }),
  });

  return { listQuery, addRecord, editRecord, removeRecord };
}

export function useScheduleLeaveRecords(monthKey: string, enabled = true) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: leaveKey(monthKey),
    queryFn: () => fetchLeaveRecords(monthKey),
    enabled,
  });

  const addRecord = useMutation({
    mutationFn: (input: { data: LeaveRecordInput; recordedBy: string }) =>
      createLeaveRecord(monthKey, input.data, input.recordedBy),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leaveKey(monthKey) }),
  });

  const editRecord = useMutation({
    mutationFn: (input: { id: string; data: Partial<LeaveRecordInput> }) =>
      updateLeaveRecord(input.id, input.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leaveKey(monthKey) }),
  });

  const removeRecord = useMutation({
    mutationFn: deleteLeaveRecord,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leaveKey(monthKey) }),
  });

  return { listQuery, addRecord, editRecord, removeRecord };
}
