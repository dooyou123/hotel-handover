import * as XLSX from 'xlsx';

export type ParsedSheet = {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
};

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
  const rows = matrix.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] ?? '').trim();
    });
    return row;
  }).filter((row) => Object.values(row).some((v) => v));
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

export const RATE_KEY_CANDIDATES = [
  '예약번호',
  'ota',
  'ota_no',
  'otano',
  'global_rsvn_no',
  'globalrsvnno',
  'reservation_number',
  'reservation',
  'res_no',
  'conf_no',
  'booking_id',
  'booking_no',
  '대행사예약번호',
  '바우처',
] as const;

export const RATE_GUEST_CANDIDATES = [
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
  'rsvn_status_code',
  'status',
  'sts',
  '예약상태',
  '구분',
  '상태',
] as const;

export const RATE_ACCOUNT_CANDIDATES = [
  'account',
  'acc',
  '어카운트',
  '결제구분',
  '지불구분',
  '결제',
  'account_name',
] as const;

export const RATE_ROOM_CANDIDATES = ['객실', 'room', 'room_no', 'room_number', '호실', 'rm_no'] as const;

export const RATE_DATE_CANDIDATES = [
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
  'total_amt',
  'totalamount',
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

export function guessColumn(headers: string[], candidates: readonly string[]): string {
  const normalized = new Set(headers.map(normalizeHeader));
  for (const candidate of candidates) {
    const key = normalizeHeader(candidate);
    if (normalized.has(key)) return key;
  }
  for (const header of headers) {
    for (const candidate of candidates) {
      if (header.includes(normalizeHeader(candidate))) return header;
    }
  }
  return headers[0] ?? '';
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

export function guessColumnMapping(headers: string[]): ColumnMappingFields {
  return {
    ota: guessColumn(headers, RATE_KEY_CANDIDATES),
    guestName: guessColumn(headers, RATE_GUEST_CANDIDATES),
    status: guessColumn(headers, RATE_STATUS_CANDIDATES),
    rate: guessColumn(headers, RATE_AMOUNT_CANDIDATES),
    account: guessColumn(headers, RATE_ACCOUNT_CANDIDATES),
    ciDate: guessColumn(headers, RATE_DATE_CANDIDATES),
  };
}
