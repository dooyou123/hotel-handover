import type { ParsedSheet } from '@/lib/rate-confirm/parse';
import {
  isAccountEqual,
  isCancelledStatus,
  isDateEqual,
  isStatusEqual,
  normalizeRate,
} from '@/lib/rate-confirm/normalize';

export type ReconcileError = 'MISSING_IN_PMS' | 'STATUS_MISMATCH' | 'DATE_MISMATCH' | 'RATE_MISMATCH';

export type ColumnMapping = {
  ota: string;
  guestName: string;
  status: string;
  rate: string;
  account: string;
  ciDate: string;
};

export type RawBooking = {
  ota: string;
  guestName: string;
  status: string;
  rate: string;
  account: string;
  ciDate: string;
};

export type AggregatedSide = {
  status: string;
  rate: number;
  rateDisplay: string;
  account: string;
  ciDate: string;
  count: number;
  breakdown: string[];
  guestName: string;
};

export type ReconcileRecord = {
  ota: string;
  guestName: string;
  errors: ReconcileError[];
  tl: AggregatedSide | null;
  pms: AggregatedSide | null;
};

export type ReconcileResult = {
  errors: ReconcileRecord[];
  matches: ReconcileRecord[];
  summary: {
    errorCount: number;
    tlCount: number;
    pmsCount: number;
    missingCount: number;
    statusCount: number;
    dateCount: number;
    rateCount: number;
  };
};

function cell(row: Record<string, string>, col: string): string {
  if (!col) return '';
  return (row[col] ?? '').trim();
}

export function rowsToBookings(sheet: ParsedSheet, mapping: ColumnMapping): RawBooking[] {
  const list: RawBooking[] = [];
  for (const row of sheet.rows) {
    const ota = cell(row, mapping.ota);
    if (!ota) continue;
    list.push({
      ota,
      guestName: cell(row, mapping.guestName),
      status: cell(row, mapping.status),
      rate: cell(row, mapping.rate),
      account: cell(row, mapping.account),
      ciDate: cell(row, mapping.ciDate),
    });
  }
  return list;
}

function aggregateTlBookings(bookings: RawBooking[]): Map<string, RawBooking[]> {
  const cancelledOtas = new Set<string>();
  const grouped = new Map<string, RawBooking[]>();

  for (const item of bookings) {
    const rowText = `${item.status} ${item.guestName} ${item.rate}`;
    if (isCancelledStatus(item.status, rowText)) {
      cancelledOtas.add(item.ota);
    }
  }

  for (const item of bookings) {
    if (cancelledOtas.has(item.ota)) continue;
    const rowText = `${item.status} ${item.guestName}`;
    if (isCancelledStatus(item.status, rowText)) continue;

    const list = grouped.get(item.ota) ?? [];
    list.push(item);
    grouped.set(item.ota, list);
  }

  return grouped;
}

function aggregatePmsBookings(bookings: RawBooking[]): Map<string, RawBooking[]> {
  const grouped = new Map<string, RawBooking[]>();
  for (const item of bookings) {
    const list = grouped.get(item.ota) ?? [];
    list.push(item);
    grouped.set(item.ota, list);
  }
  return grouped;
}

function toAggregatedSide(items: RawBooking[]): AggregatedSide {
  const totalRate = items.reduce((sum, item) => sum + normalizeRate(item.rate), 0);
  return {
    status: items[0]?.status ?? '',
    rate: totalRate,
    rateDisplay: totalRate.toLocaleString(),
    account: items[0]?.account ?? '',
    ciDate: items[0]?.ciDate ?? '',
    count: items.length,
    breakdown: items.map((item) => item.rate),
    guestName: items[0]?.guestName ?? '',
  };
}

export function performReconciliation(
  tlSheet: ParsedSheet,
  pmsSheet: ParsedSheet,
  tlMapping: ColumnMapping,
  pmsMapping: ColumnMapping,
): ReconcileResult {
  const tlGrouped = aggregateTlBookings(rowsToBookings(tlSheet, tlMapping));
  const pmsGrouped = aggregatePmsBookings(rowsToBookings(pmsSheet, pmsMapping));

  const errorRecords: ReconcileRecord[] = [];
  const matchRecords: ReconcileRecord[] = [];

  for (const [ota, tlItems] of tlGrouped) {
    const pmsItems = pmsGrouped.get(ota) ?? [];
    const errors: ReconcileError[] = [];

    const tlSide = toAggregatedSide(tlItems);
    let pmsSide: AggregatedSide | null = null;

    if (pmsItems.length === 0) {
      errors.push('MISSING_IN_PMS');
    } else {
      pmsSide = toAggregatedSide(pmsItems);

      if (!isStatusEqual(tlSide.status, pmsSide.status)) {
        errors.push('STATUS_MISMATCH');
      }
      if (!isDateEqual(tlSide.ciDate, pmsSide.ciDate)) {
        errors.push('DATE_MISMATCH');
      }
      const rateDiff = tlSide.rate !== pmsSide.rate;
      const accDiff = !isAccountEqual(tlSide.account, pmsSide.account);
      if (rateDiff || accDiff) {
        errors.push('RATE_MISMATCH');
      }
    }

    const record: ReconcileRecord = {
      ota,
      guestName: tlSide.guestName || pmsSide?.guestName || '—',
      errors,
      tl: tlSide,
      pms: pmsSide,
    };

    if (errors.length > 0) {
      errorRecords.push(record);
    } else {
      matchRecords.push(record);
    }
  }

  let missingCount = 0;
  let statusCount = 0;
  let dateCount = 0;
  let rateCount = 0;

  for (const record of errorRecords) {
    if (record.errors.includes('MISSING_IN_PMS')) missingCount += 1;
    if (record.errors.includes('STATUS_MISMATCH')) statusCount += 1;
    if (record.errors.includes('DATE_MISMATCH')) dateCount += 1;
    if (record.errors.includes('RATE_MISMATCH')) rateCount += 1;
  }

  return {
    errors: errorRecords,
    matches: matchRecords,
    summary: {
      errorCount: errorRecords.length,
      tlCount: tlGrouped.size,
      pmsCount: pmsGrouped.size,
      missingCount,
      statusCount,
      dateCount,
      rateCount,
    },
  };
}

export const ERROR_LABELS: Record<ReconcileError, string> = {
  MISSING_IN_PMS: 'PMS 누락',
  STATUS_MISMATCH: '상태 불일치',
  DATE_MISMATCH: '날짜 불일치',
  RATE_MISMATCH: '객실료/어카운트 불일치',
};
