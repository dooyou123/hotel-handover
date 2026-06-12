import type { ReconcileError, ReconcileRecord, ReconcileResult } from '@/lib/rate-confirm/compare-engine';

export type RateConfirmResolutionStatus = 'pending' | 'resolved' | 'skipped';

export type RateConfirmResolutionAction =
  | 'PMS_RATE_ADJUSTED'
  | 'PMS_STATUS_UPDATED'
  | 'PMS_DATE_UPDATED'
  | 'PMS_ACCOUNT_UPDATED'
  | 'PMS_REGISTERED'
  | 'TL_CANCEL_SYNCED'
  | 'FALSE_POSITIVE'
  | 'OTHER';

export const RESOLUTION_ACTION_LABELS: Record<RateConfirmResolutionAction, string> = {
  PMS_RATE_ADJUSTED: 'PMS 객실료 수정',
  PMS_STATUS_UPDATED: 'PMS 예약 상태 수정',
  PMS_DATE_UPDATED: 'PMS 체크인일 수정',
  PMS_ACCOUNT_UPDATED: 'PMS OTA명(Account) 수정',
  PMS_REGISTERED: 'PMS 신규 등록',
  TL_CANCEL_SYNCED: 'TL 취소·변경 반영',
  FALSE_POSITIVE: '오탐 (실제 일치)',
  OTHER: '기타',
};

export const RESOLUTION_STATUS_LABELS: Record<RateConfirmResolutionStatus, string> = {
  pending: '미처리',
  resolved: '처리 완료',
  skipped: '처리 불필요',
};

export type RateConfirmSessionSummary = ReconcileResult['summary'] & {
  matchCount?: number;
};

export type RateConfirmSession = {
  id: string;
  hotel_id: string;
  author: string;
  work_group: string;
  tl_file_name: string;
  pms_file_name: string;
  summary: RateConfirmSessionSummary;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type RateConfirmItem = {
  id: string;
  session_id: string;
  hotel_id: string;
  ota: string;
  guest_name: string;
  error_codes: ReconcileError[];
  record_snapshot: ReconcileRecord;
  rate_delta: number | null;
  pms_adjust: number | null;
  resolution_status: RateConfirmResolutionStatus;
  resolution_action: string;
  resolution_note: string;
  resolved_by: string;
  work_group: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RateConfirmSessionDetail = RateConfirmSession & {
  items: RateConfirmItem[];
};

export type SaveResolutionInput = {
  resolution_status: 'resolved' | 'skipped';
  resolution_action: RateConfirmResolutionAction | '';
  resolution_note: string;
};
