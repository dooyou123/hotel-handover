export type ApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type LeaveType = 'full' | 'am' | 'pm';

export type ScheduleOvertimeRecord = {
  id: string;
  hotel_id: string;
  month_key: string;
  staff_name: string;
  work_date: string;
  hours: number;
  reason: string;
  approval_submitted: boolean;
  approval_status: ApprovalStatus;
  recorded_by: string;
  created_at: string;
  updated_at: string;
};

export type ScheduleLeaveRecord = {
  id: string;
  hotel_id: string;
  month_key: string;
  staff_name: string;
  work_date: string;
  leave_type: LeaveType;
  clock_in: string;
  clock_out: string;
  approval_submitted: boolean;
  approval_status: ApprovalStatus;
  recorded_by: string;
  created_at: string;
  updated_at: string;
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  none: '미상신',
  pending: '상신중',
  approved: '승인',
  rejected: '반려',
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  full: '연차',
  am: '오전 반차',
  pm: '오후 반차',
};

export type OvertimeRecordInput = {
  staff_name: string;
  work_date: string;
  hours: number;
  reason: string;
  approval_submitted: boolean;
  approval_status: ApprovalStatus;
};

export type LeaveRecordInput = {
  staff_name: string;
  work_date: string;
  leave_type: LeaveType;
  clock_in?: string;
  clock_out?: string;
  approval_submitted: boolean;
  approval_status: ApprovalStatus;
};
