import type { ReconcileRecord, ReconcileResult } from '@/lib/rate-confirm/compare-engine';
import { getRecordRateMeta } from '@/lib/rate-confirm/record-meta';

export type RateConfirmItemInsert = {
  ota: string;
  guest_name: string;
  error_codes: string[];
  record_snapshot: ReconcileRecord;
  rate_delta: number | null;
  pms_adjust: number | null;
};

export function buildItemInsertsFromErrors(errors: ReconcileRecord[]): RateConfirmItemInsert[] {
  return errors.map((record) => {
    const meta = getRecordRateMeta(record);
    return {
      ota: record.ota,
      guest_name: record.guestName,
      error_codes: record.errors,
      record_snapshot: record,
      rate_delta: meta.delta,
      pms_adjust: meta.pmsAdjust,
    };
  });
}

export function countResolvedItems(items: { resolution_status: string }[]): {
  pending: number;
  resolved: number;
  skipped: number;
} {
  let pending = 0;
  let resolved = 0;
  let skipped = 0;
  for (const item of items) {
    if (item.resolution_status === 'resolved') resolved += 1;
    else if (item.resolution_status === 'skipped') skipped += 1;
    else pending += 1;
  }
  return { pending, resolved, skipped };
}

export function sessionProgressLabel(items: { resolution_status: string }[]): string {
  const { pending, resolved, skipped } = countResolvedItems(items);
  const done = resolved + skipped;
  const total = items.length;
  if (!total) return '불일치 없음';
  if (pending === 0) return `전체 처리 (${done}/${total})`;
  return `처리 ${done}/${total} · 미처리 ${pending}`;
}
