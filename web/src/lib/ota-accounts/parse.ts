import type { OtaAccount, OtaAccountColumnMapping } from '@/lib/ota-accounts/types';

const SITE_HEADERS = ['ota', '사이트', '이름', 'name', '채널', 'channel', 'site', 'ota명', 'ota명칭', '플랫폼'];
const LOGIN_HEADERS = ['id', '아이디', 'login', 'account', '로그인', '이메일', 'email', 'userid', 'user id'];
const PASSWORD_HEADERS = ['pw', 'password', '비밀번호', '비번', 'pass', '패스워드'];
const NOTE_HEADERS = ['note', '메모', '비고', 'url', '링크', 'link', '비고사항'];

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function findColumnIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const index = normalized.indexOf(normalizeHeader(alias));
    if (index >= 0) return index;
  }
  return -1;
}

function cellValue(row: string[], index: number): string {
  if (index < 0) return '';
  return String(row[index] ?? '').trim();
}

export function parseOtaAccountRows(
  rows: string[][],
  mapping?: OtaAccountColumnMapping,
): OtaAccount[] {
  if (!rows.length) return [];

  const [headerRow, ...bodyRows] = rows;
  const headers = headerRow.map((cell) => String(cell ?? '').trim());

  let siteIndex = mapping?.site
    ? findColumnIndex(headers, [mapping.site])
    : findColumnIndex(headers, SITE_HEADERS);
  let loginIndex = mapping?.login
    ? findColumnIndex(headers, [mapping.login])
    : findColumnIndex(headers, LOGIN_HEADERS);
  let passwordIndex = mapping?.password
    ? findColumnIndex(headers, [mapping.password])
    : findColumnIndex(headers, PASSWORD_HEADERS);
  const noteIndex = findColumnIndex(headers, NOTE_HEADERS);

  const hasHeaderMatch = siteIndex >= 0 || loginIndex >= 0 || passwordIndex >= 0;
  const dataRows = hasHeaderMatch ? bodyRows : rows;

  if (!hasHeaderMatch) {
    siteIndex = 0;
    loginIndex = 1;
    passwordIndex = 2;
  }

  const accounts: OtaAccount[] = [];

  dataRows.forEach((row, rowIndex) => {
    const site = cellValue(row, siteIndex);
    const loginId = cellValue(row, loginIndex);
    const password = cellValue(row, passwordIndex);
    const note = cellValue(row, noteIndex);

    if (!site && !loginId && !password) return;

    accounts.push({
      id: `${rowIndex}-${site || loginId || 'row'}`,
      site,
      loginId,
      password,
      note,
    });
  });

  return accounts;
}

export function parseOtaAccountCsv(text: string, mapping?: OtaAccountColumnMapping): OtaAccount[] {
  const rows = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => parseCsvLine(line))
    .filter((row) => row.some((cell) => cell.trim()));

  return parseOtaAccountRows(rows, mapping);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}
