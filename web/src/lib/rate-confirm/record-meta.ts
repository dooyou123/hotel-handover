import type { ReconcileRecord } from '@/lib/rate-confirm/compare-engine';
import { isAccountEqual, isDateEqual, isStatusEqual, normalizeRate } from '@/lib/rate-confirm/normalize';

export type RecordRateMeta = {
  missing: boolean;
  tlRate: number | null;
  pmsRate: number | null;
  rateMismatch: boolean;
  delta: number | null;
  pmsAdjust: number | null;
  statusDiff: boolean;
  dateDiff: boolean;
  accDiff: boolean;
};

export function getRecordRateMeta(record: ReconcileRecord): RecordRateMeta {
  const missing = record.errors.includes('MISSING_IN_PMS');
  const tl = record.tl;
  const pms = record.pms;
  const tlRate = tl ? normalizeRate(tl.rate) : null;
  const pmsRate = pms ? normalizeRate(pms.rate) : null;
  const rateMismatch =
    !missing && tlRate != null && pmsRate != null && tlRate !== pmsRate;
  const delta =
    rateMismatch && tlRate != null && pmsRate != null ? pmsRate - tlRate : null;
  const pmsAdjust =
    rateMismatch && tlRate != null && pmsRate != null ? tlRate - pmsRate : null;

  return {
    missing,
    tlRate,
    pmsRate,
    rateMismatch,
    delta,
    pmsAdjust,
    statusDiff: !missing && !!tl && !!pms && !isStatusEqual(tl.status, pms.status),
    dateDiff: !missing && !!tl && !!pms && !isDateEqual(tl.ciDate, pms.ciDate),
    accDiff: !missing && !!tl && !!pms && !isAccountEqual(tl.account, pms.account),
  };
}
