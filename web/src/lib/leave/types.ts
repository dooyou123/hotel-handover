export type LeaveRequestStatus = 'approved' | 'pending_review' | 'rejected' | 'cancelled';

export type LeavePolicy = {
  max_days_per_month: number;
  max_staff_per_day: number;
  apply_month_offset: number;
  application_open_day: number;
  application_close_day: number;
};

export type LeaveBlockedDate = {
  id: string;
  hotel_id: string;
  block_month: number;
  block_day: number;
  label: string;
};

export type LeaveRequest = {
  id: string;
  hotel_id: string;
  staff_name: string;
  work_group: string;
  leave_date: string;
  status: LeaveRequestStatus;
  is_exception: boolean;
  reason: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export const LEAVE_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  approved: '확정',
  pending_review: '사전 협의',
  rejected: '반려',
  cancelled: '취소',
};
