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

/** TL OTA명 · PMS Account(FM채널명) 비교용 채널 키 */
export function normalizeOtaChannel(acc: string): string {
  if (!acc) return '';

  let s = acc.toLowerCase();
  s = s.replace(/株式会社/g, '');
  s = s.replace(/^fm/, '');
  s = s.replace(/\(.*?\)/g, '');
  s = s.replace(/[^a-z0-9가-힣]/g, '');

  if (s.includes('tripcom') || s.includes('ctrip') || s === 'tcom') {
    return 'ctrip';
  }
  if (s.includes('booking')) return 'booking';
  if (s.includes('expedia')) return 'expedia';
  if (s.includes('agoda')) return 'agoda';
  if (s.includes('tripla')) return 'tripla';
  if (s.includes('rakuten')) return 'rakuten';
  if (s.includes('didatravel') || s.includes('dida')) return 'didatravel';
  if (s.includes('hotelbeds')) return 'hotelbeds';
  if (s.includes('hikari')) return 'hikari';

  return s;
}

function channelsMatch(acc1: string, acc2: string): boolean {
  const c1 = normalizeOtaChannel(acc1);
  const c2 = normalizeOtaChannel(acc2);
  if (!c1 || !c2) return false;
  if (c1 === c2) return true;
  if (c1.includes(c2) || c2.includes(c1)) return true;
  return false;
}

export function isAccountEqual(acc1: string, acc2: string): boolean {
  const a1 = normalizeAccount(acc1);
  const a2 = normalizeAccount(acc2);
  if (a1 === a2) return true;
  if (a1 && a2 && (a1.includes(a2) || a2.includes(a1))) return true;

  if (channelsMatch(acc1, acc2)) return true;

  const isTrip = (acc: string) => {
    const a = acc.toLowerCase();
    return a.includes('trip') || a.includes('ctrip') || a.includes('tcom');
  };
  if (a1 && a2 && isTrip(a1) && isTrip(a2)) return true;

  return false;
}

function pad2(value: string): string {
  return value.padStart(2, '0');
}

function toIsoDate(year: string, month: string, day: string): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function isReasonableYear(year: number): boolean {
  return year >= 1900 && year <= 2099;
}

function isReasonableMonth(month: number): boolean {
  return month >= 1 && month <= 12;
}

function isReasonableDay(day: number): boolean {
  return day >= 1 && day <= 31;
}

/** MM/DD/YYYY · DD/MM/YYYY 등 구분자 날짜 (연도가 끝에 오는 형식) */
function parseDelimitedEndingYear(value: string): string | null {
  const match = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (!match) return null;

  const partA = Number(match[1]);
  const partB = Number(match[2]);
  const year = Number(match[3]);
  if (!isReasonableYear(year)) return null;

  if (partA > 12 && isReasonableMonth(partB) && isReasonableDay(partA)) {
    return toIsoDate(String(year), String(partB), String(partA));
  }

  if (partB > 12 && isReasonableMonth(partA) && isReasonableDay(partB)) {
    return toIsoDate(String(year), String(partA), String(partB));
  }

  if (isReasonableMonth(partA) && isReasonableDay(partB)) {
    return toIsoDate(String(year), String(partA), String(partB));
  }

  return null;
}

/** Excel 날짜 시리얼(숫자만) → ISO */
function excelSerialToIso(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial >= 100_000) return null;
  const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000);
  const year = date.getUTCFullYear();
  if (!isReasonableYear(year)) return null;
  return toIsoDate(String(year), String(date.getUTCMonth() + 1), String(date.getUTCDate()));
}

export function normalizeDate(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim().replace(/\([^)]*\)\s*$/, '').trim();

  const ymd = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    if (isReasonableYear(year) && isReasonableMonth(month) && isReasonableDay(day)) {
      return toIsoDate(ymd[1], ymd[2], ymd[3]);
    }
  }

  const endingYear = parseDelimitedEndingYear(trimmed);
  if (endingYear) return endingYear;

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const serial = Number(trimmed);
    const fromSerial = excelSerialToIso(serial);
    if (fromSerial) return fromSerial;
  }

  const cleaned = trimmed.replace(/[^0-9]/g, '');
  if (cleaned.length === 8) {
    const yearFirst = Number(cleaned.slice(0, 4));
    if (isReasonableYear(yearFirst)) {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
    }
    const yearLast = Number(cleaned.slice(4, 8));
    if (isReasonableYear(yearLast)) {
      return `${cleaned.slice(4, 8)}-${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}`;
    }
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
