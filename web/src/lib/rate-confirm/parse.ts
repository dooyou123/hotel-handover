import * as XLSX from 'xlsx';

export type ParsedSheet = {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
};

export type RateFileFormat = 'tl_booking_search' | 'pms_reservation_list' | 'generic';

export type RateFileSide = 'tl' | 'pms';

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function parseCsvText(text: string): string[][] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  return lines.map((line) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    cells.push(current.trim());
    return cells;
  });
}

function rowsFromMatrix(matrix: string[][], fileName: string): ParsedSheet {
  if (!matrix.length) return { headers: [], rows: [], fileName };
  const headers = matrix[0].map(normalizeHeader);
  const rows = matrix
    .slice(1)
    .map((cells) => {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = (cells[index] ?? '').trim();
      });
      return row;
    })
    .filter((row) => Object.values(row).some((v) => v));
  return { headers, rows, fileName };
}

export async function parseRateFile(file: File): Promise<ParsedSheet> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][];
    const stringMatrix = matrix.map((row) => row.map((cell) => String(cell ?? '').trim()));
    return rowsFromMatrix(stringMatrix, file.name);
  }

  const text = await file.text();
  return rowsFromMatrix(parseCsvText(text), file.name);
}

/** TL-Lincoln 예약검색 CSV (다열 RAW) */
export const TL_BOOKING_SEARCH_HEADERS = {
  ota: '판매처_예약번호',
  guestName: '단체명_또는_대표자_성명(반각)',
  status: '통지종류(분류)별',
  rate: '합계숙박요금(총액)',
  account: 'ota명',
  ciDate: '체크인날짜',
} as const;

/** 산하 IT PMS Reservation List export */
export const PMS_RESERVATION_LIST_HEADERS = {
  ota: 'ota_no',
  guestName: 'guest_name',
  status: 'sts',
  rate: 'room_rate',
  account: 'account',
  ciDate: 'arr_date',
} as const;

export const RATE_KEY_CANDIDATES = [
  '판매처_예약번호',
  '판매처 예약번호',
  '예약번호',
  'global_rsvn_no',
  'globalrsvnno',
  'ota_no',
  'otano',
  'reservation_number',
  'res_no',
  'conf_no',
  'booking_id',
  'booking_no',
  '대행사예약번호',
  '바우처',
  'ota',
] as const;

export const RATE_GUEST_CANDIDATES = [
  '단체명_또는_대표자_성명(반각)',
  '단체명 또는 대표자 성명(반각)',
  'guest_name',
  'guestname',
  '고객명',
  '투숙객명',
  '투숙객',
  'guest',
  'name',
  '성명',
] as const;

export const RATE_STATUS_CANDIDATES = [
  '통지종류(분류)별',
  '통지종류 (분류)별',
  'rsvn_status_code',
  '예약상태',
  'status',
  'sts',
  '상태',
  '구분',
] as const;

export const RATE_ACCOUNT_CANDIDATES = [
  'ota명',
  'ota_name',
  'otaname',
  'ota name',
  'account',
  'acc',
  '어카운트',
  '사전결제정보',
  '결제구분',
  '지불구분',
  '결제',
  'account_name',
] as const;

export const RATE_ROOM_CANDIDATES = ['객실', 'room', 'room_no', 'room_number', '호실', 'rm_no'] as const;

export const RATE_DATE_CANDIDATES = [
  '체크인날짜',
  'arr_date',
  'arrdate',
  'arrival',
  '체크인',
  'check_in',
  'checkin',
  '도착일',
  '투숙일',
  'date',
  'ci_date',
] as const;

export const RATE_AMOUNT_CANDIDATES = [
  '합계숙박요금(총액)',
  '합계숙박요금',
  'total_amt',
  'totalamount',
  'total_amount',
  '객실료',
  'room_rate',
  'rate',
  'amount',
  '금액',
  'total',
  'net',
  'price',
  'room_charge',
  '판매가',
  '총금액',
  '합계',
] as const;

function headerSet(headers: string[]): Set<string> {
  return new Set(headers.map(normalizeHeader));
}

function hasHeaders(headers: string[], required: readonly string[]): boolean {
  const set = headerSet(headers);
  return required.every((name) => set.has(normalizeHeader(name)));
}

/** 업로드 파일 포맷 감지 */
export function detectRateFileFormat(headers: string[]): RateFileFormat {
  if (
    hasHeaders(headers, [
      TL_BOOKING_SEARCH_HEADERS.ota,
      TL_BOOKING_SEARCH_HEADERS.status,
      TL_BOOKING_SEARCH_HEADERS.rate,
    ])
  ) {
    return 'tl_booking_search';
  }

  if (
    hasHeaders(headers, [
      PMS_RESERVATION_LIST_HEADERS.ota,
      PMS_RESERVATION_LIST_HEADERS.guestName,
      PMS_RESERVATION_LIST_HEADERS.rate,
    ])
  ) {
    return 'pms_reservation_list';
  }

  return 'generic';
}

function partialMatchExclusions(candidate: string): RegExp[] {
  const key = normalizeHeader(candidate);
  if (key === 'ota') {
    return [/^ota_코드$/, /^ota명$/, /^ota코드/, /^린칸_ota/];
  }
  if (key === '합계') {
    return [/^이용객실합계/, /^이용객총합계/, /^합계기타요금$/];
  }
  if (key === '구분') {
    return [/^전송객구분$/, /^요금단가구분$/, /^세금봉사료구분$/];
  }
  if (key === 'ota명' || key === 'ota_name' || key === 'ota') {
    return [/^ota_코드$/, /^ota코드/, /^린칸_ota/];
  }
  return [];
}

export function guessColumn(headers: string[], candidates: readonly string[]): string {
  const normalizedHeaders = headers.map(normalizeHeader);
  const normalized = new Set(normalizedHeaders);

  for (const candidate of candidates) {
    const key = normalizeHeader(candidate);
    if (normalized.has(key)) return key;
  }

  for (const header of normalizedHeaders) {
    for (const candidate of candidates) {
      const key = normalizeHeader(candidate);
      if (!header.includes(key)) continue;
      if (partialMatchExclusions(candidate).some((pattern) => pattern.test(header))) continue;
      return header;
    }
  }

  return normalizedHeaders[0] ?? '';
}

export function parseAmount(value: string): number | null {
  const cleaned = value.replace(/[₩,\s원]/g, '').trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export type ColumnMappingFields = {
  ota: string;
  guestName: string;
  status: string;
  rate: string;
  account: string;
  ciDate: string;
};

function presetMapping(
  preset: typeof TL_BOOKING_SEARCH_HEADERS | typeof PMS_RESERVATION_LIST_HEADERS,
): ColumnMappingFields {
  return {
    ota: preset.ota,
    guestName: preset.guestName,
    status: preset.status,
    rate: preset.rate,
    account: preset.account,
    ciDate: preset.ciDate,
  };
}

export function guessColumnMapping(headers: string[], side?: RateFileSide): ColumnMappingFields {
  const format = detectRateFileFormat(headers);

  if (side === 'tl' && format === 'tl_booking_search') {
    return presetMapping(TL_BOOKING_SEARCH_HEADERS);
  }
  if (side === 'pms' && format === 'pms_reservation_list') {
    return presetMapping(PMS_RESERVATION_LIST_HEADERS);
  }
  if (!side && format === 'tl_booking_search') {
    return presetMapping(TL_BOOKING_SEARCH_HEADERS);
  }
  if (!side && format === 'pms_reservation_list') {
    return presetMapping(PMS_RESERVATION_LIST_HEADERS);
  }

  return {
    ota: guessColumn(headers, RATE_KEY_CANDIDATES),
    guestName: guessColumn(headers, RATE_GUEST_CANDIDATES),
    status: guessColumn(headers, RATE_STATUS_CANDIDATES),
    rate: guessColumn(headers, RATE_AMOUNT_CANDIDATES),
    account: guessColumn(headers, RATE_ACCOUNT_CANDIDATES),
    ciDate: guessColumn(headers, RATE_DATE_CANDIDATES),
  };
}
