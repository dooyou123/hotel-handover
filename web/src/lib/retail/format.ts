/** YYYY-MM-01 */
export function toYearMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export function parseYearMonthKey(key: string): Date {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

export function formatYearMonthLabel(key: string): string {
  const date = parseYearMonthKey(key);
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
}

/** 월초 정산용 — 기본은 지난달 */
export function defaultSettlementYearMonth(): string {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - 1);
  return toYearMonthKey(date);
}

export function shiftYearMonth(key: string, deltaMonths: number): string {
  const date = parseYearMonthKey(key);
  date.setMonth(date.getMonth() + deltaMonths);
  return toYearMonthKey(date);
}
