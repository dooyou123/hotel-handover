/** Chrome 확장 Reservation Reconciler와 동일한 정규화 규칙 */

export function normalizeStatus(status: string): string {
  if (!status) return '';
  return status.toLowerCase().replace(/\s+/g, '');
}

export function isStatusEqual(status1: string, status2: string): boolean {
  const s1 = normalizeStatus(status1);
  const s2 = normalizeStatus(status2);
  if (s1 === s2) return true;
  if ((s1 === '예약' || s1 === '변경') && s2 === 'rr') return true;
  if (s1 === 'rr' && (s2 === '예약' || s2 === '변경')) return true;
  return false;
}

export function normalizeRate(rate: string | number | null | undefined): number {
  if (rate === undefined || rate === null) return 0;
  const cleaned = rate.toString().replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return Number.isNaN(num) ? 0 : num;
}

export function normalizeAccount(acc: string): string {
  if (!acc) return '';
  return acc.toLowerCase().replace(/\s+/g, '').replace(/[.-]/g, '');
}

export function isAccountEqual(acc1: string, acc2: string): boolean {
  const a1 = normalizeAccount(acc1);
  const a2 = normalizeAccount(acc2);
  if (a1 === a2) return true;
  if (a1 && a2 && (a1.includes(a2) || a2.includes(a1))) return true;

  const isTrip = (acc: string) => {
    const a = acc.toLowerCase();
    return a.includes('trip') || a.includes('ctrip') || a.includes('tcom');
  };
  if (a1 && a2 && isTrip(a1) && isTrip(a2)) return true;

  return false;
}

export function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const cleaned = dateStr.replace(/[^0-9]/g, '');
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
  }
  if (cleaned.length === 6) {
    return `20${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}`;
  }
  return cleaned;
}

export function isDateEqual(tlVal: string, pmsVal: string): boolean {
  if (!pmsVal) return true;
  return normalizeDate(tlVal) === normalizeDate(pmsVal);
}

export function isCancelledStatus(status: string, rowText?: string): boolean {
  if (status === '취소' || status.includes('취소')) return true;
  if (rowText && rowText.includes('취소')) return true;
  return false;
}
