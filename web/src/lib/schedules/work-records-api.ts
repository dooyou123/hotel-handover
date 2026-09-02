import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { isValidMonthKey } from '@/lib/schedules/api';
import type {
  ApprovalStatus,
  LeaveRecordInput,
  OvertimeRecordInput,
  ScheduleLeaveRecord,
  ScheduleOvertimeRecord,
} from '@/lib/schedules/work-records-types';

function monthKeyFromDate(date: string): string {
  return date.trim().slice(0, 7);
}

function normalizeApproval(input: {
  approval_submitted: boolean;
  approval_status: ApprovalStatus;
}): { approval_submitted: boolean; approval_status: ApprovalStatus } {
  if (!input.approval_submitted) {
    return { approval_submitted: false, approval_status: 'none' };
  }
  if (input.approval_status === 'none') {
    return { approval_submitted: true, approval_status: 'pending' };
  }
  return input;
}

export async function fetchOvertimeRecords(monthKey: string): Promise<ScheduleOvertimeRecord[]> {
  if (!isValidMonthKey(monthKey)) throw new Error('올바른 연·월을 선택해 주세요.');
  const supabase = createClient();
  const { data, error } = await supabase
    .from('schedule_overtime_records')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('month_key', monthKey)
    .order('work_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ScheduleOvertimeRecord[];
}

export async function fetchLeaveRecords(monthKey: string): Promise<ScheduleLeaveRecord[]> {
  if (!isValidMonthKey(monthKey)) throw new Error('올바른 연·월을 선택해 주세요.');
  const supabase = createClient();
  const { data, error } = await supabase
    .from('schedule_leave_records')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('month_key', monthKey)
    .order('work_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ScheduleLeaveRecord[];
}

export async function createOvertimeRecord(
  monthKey: string,
  input: OvertimeRecordInput,
  recordedBy: string,
): Promise<ScheduleOvertimeRecord> {
  if (!isValidMonthKey(monthKey)) throw new Error('올바른 연·월을 선택해 주세요.');
  const staffName = input.staff_name.trim();
  const workDate = input.work_date.trim();
  const reason = input.reason.trim();
  if (!staffName) throw new Error('직원명을 선택해 주세요.');
  if (!workDate) throw new Error('날짜를 입력해 주세요.');
  if (!reason) throw new Error('연장 사유를 입력해 주세요.');
  if (!Number.isInteger(input.hours) || input.hours < 1) {
    throw new Error('연장 시간은 1시간 단위로 입력해 주세요.');
  }

  const approval = normalizeApproval(input);
  const supabase = createClient();
  const { data, error } = await supabase
    .from('schedule_overtime_records')
    .insert({
      hotel_id: DEFAULT_HOTEL_ID,
      month_key: monthKeyFromDate(workDate) || monthKey,
      staff_name: staffName,
      work_date: workDate,
      hours: input.hours,
      reason,
      approval_submitted: approval.approval_submitted,
      approval_status: approval.approval_status,
      recorded_by: recordedBy,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as ScheduleOvertimeRecord;
}

export async function createLeaveRecord(
  monthKey: string,
  input: LeaveRecordInput,
  recordedBy: string,
): Promise<ScheduleLeaveRecord> {
  if (!isValidMonthKey(monthKey)) throw new Error('올바른 연·월을 선택해 주세요.');
  const staffName = input.staff_name.trim();
  const workDate = input.work_date.trim();
  if (!staffName) throw new Error('직원명을 선택해 주세요.');
  if (!workDate) throw new Error('날짜를 입력해 주세요.');

  const approval = normalizeApproval(input);
  const supabase = createClient();
  const { data, error } = await supabase
    .from('schedule_leave_records')
    .insert({
      hotel_id: DEFAULT_HOTEL_ID,
      month_key: monthKeyFromDate(workDate) || monthKey,
      staff_name: staffName,
      work_date: workDate,
      leave_type: input.leave_type,
      clock_in: input.clock_in?.trim() ?? '',
      clock_out: input.clock_out?.trim() ?? '',
      approval_submitted: approval.approval_submitted,
      approval_status: approval.approval_status,
      recorded_by: recordedBy,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as ScheduleLeaveRecord;
}

export async function updateOvertimeRecord(
  id: string,
  input: Partial<OvertimeRecordInput>,
): Promise<ScheduleOvertimeRecord> {
  const patch: Record<string, unknown> = {};
  if (input.staff_name !== undefined) patch.staff_name = input.staff_name.trim();
  if (input.work_date !== undefined) {
    patch.work_date = input.work_date.trim();
    patch.month_key = monthKeyFromDate(input.work_date);
  }
  if (input.hours !== undefined) patch.hours = input.hours;
  if (input.reason !== undefined) {
    const reason = input.reason.trim();
    if (!reason) throw new Error('연장 사유를 입력해 주세요.');
    patch.reason = reason;
  }
  if (input.approval_submitted !== undefined || input.approval_status !== undefined) {
    const approval = normalizeApproval({
      approval_submitted: input.approval_submitted ?? true,
      approval_status: input.approval_status ?? 'pending',
    });
    patch.approval_submitted = approval.approval_submitted;
    patch.approval_status = approval.approval_status;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('schedule_overtime_records')
    .update(patch)
    .eq('id', id)
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .select('*')
    .single();
  if (error) throw error;
  return data as ScheduleOvertimeRecord;
}

export async function updateLeaveRecord(
  id: string,
  input: Partial<LeaveRecordInput>,
): Promise<ScheduleLeaveRecord> {
  const patch: Record<string, unknown> = {};
  if (input.staff_name !== undefined) patch.staff_name = input.staff_name.trim();
  if (input.work_date !== undefined) {
    patch.work_date = input.work_date.trim();
    patch.month_key = monthKeyFromDate(input.work_date);
  }
  if (input.leave_type !== undefined) patch.leave_type = input.leave_type;
  if (input.clock_in !== undefined) patch.clock_in = input.clock_in.trim();
  if (input.clock_out !== undefined) patch.clock_out = input.clock_out.trim();
  if (input.approval_submitted !== undefined || input.approval_status !== undefined) {
    const approval = normalizeApproval({
      approval_submitted: input.approval_submitted ?? true,
      approval_status: input.approval_status ?? 'pending',
    });
    patch.approval_submitted = approval.approval_submitted;
    patch.approval_status = approval.approval_status;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('schedule_leave_records')
    .update(patch)
    .eq('id', id)
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .select('*')
    .single();
  if (error) throw error;
  return data as ScheduleLeaveRecord;
}

export async function deleteOvertimeRecord(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('schedule_overtime_records')
    .delete()
    .eq('id', id)
    .eq('hotel_id', DEFAULT_HOTEL_ID);
  if (error) throw error;
}

export async function deleteLeaveRecord(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('schedule_leave_records')
    .delete()
    .eq('id', id)
    .eq('hotel_id', DEFAULT_HOTEL_ID);
  if (error) throw error;
}
