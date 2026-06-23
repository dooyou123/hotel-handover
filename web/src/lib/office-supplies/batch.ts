/** 격주 수요일 발주 기준일 (수요일이어야 함) */
export const OFFICE_SUPPLY_ORDER_ANCHOR = '2026-01-07';

const MS_PER_DAY = 86_400_000;

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  return new Date(year, month - 1, day);
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** 오늘 또는 이후 가장 가까운 격주 수요일 */
export function getNextOrderDate(from: Date = new Date()): string {
  const anchor = parseDateOnly(OFFICE_SUPPLY_ORDER_ANCHOR);
  const today = startOfDay(from);
  const daysSinceAnchor = Math.round((today.getTime() - anchor.getTime()) / MS_PER_DAY);
  const cycleDay = ((daysSinceAnchor % 14) + 14) % 14;
  if (cycleDay === 0) return formatDateOnly(today);
  return formatDateOnly(addDays(today, 14 - cycleDay));
}

export function addOrderCycle(dateKey: string, cycles = 1): string {
  return formatDateOnly(addDays(parseDateOnly(dateKey), cycles * 14));
}

export function formatOrderDateLabel(dateKey: string): string {
  const date = parseDateOnly(dateKey);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

export function daysUntilOrderDate(dateKey: string, from: Date = new Date()): number {
  const target = parseDateOnly(dateKey);
  const today = startOfDay(from);
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
}

export type OfficeSupplyBatchInfo = {
  batchKey: string;
  orderDate: string;
  orderDateLabel: string;
  daysUntilOrder: number;
  isOrderDay: boolean;
};

export function buildBatchInfo(batchKey: string, from: Date = new Date()): OfficeSupplyBatchInfo {
  const daysUntilOrder = daysUntilOrderDate(batchKey, from);
  return {
    batchKey,
    orderDate: batchKey,
    orderDateLabel: formatOrderDateLabel(batchKey),
    daysUntilOrder,
    isOrderDay: daysUntilOrder === 0,
  };
}

export function resolveActiveBatchKey(
  submittedBatchKeys: string[],
  from: Date = new Date(),
): string {
  const submitted = new Set(submittedBatchKeys);
  let candidate = getNextOrderDate(from);
  let guard = 0;
  while (submitted.has(candidate) && guard < 52) {
    candidate = addOrderCycle(candidate);
    guard += 1;
  }
  return candidate;
}
