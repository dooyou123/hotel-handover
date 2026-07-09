import type { OtaAccount, OtaAccountColumnMapping } from '@/lib/ota-accounts/types';

const SITE_HEADERS = [
  'ota',
  '사이트',
  '이름',
  'name',
  '채널',
  'channel',
  'site',
  'ota명',
  'ota명칭',
  '플랫폼',
  '여행사명',
  '여행사',
];
const LOGIN_HEADERS = ['id', '아이디', 'login', 'account', '로그인', '이메일', 'email', 'userid', 'user id'];
const PASSWORD_HEADERS = ['pw', 'password', '비밀번호', '비번', 'pass', '패스워드'];
const EXTRA_HEADERS = ['기타', 'extra', 'note', '메모', '비고', '비고사항', 'others', 'remark', 'remarks'];
const URL_HEADERS = ['url', '링크', 'link', '주소', '사이트url'];

const HEADER_LABELS = new Set([
  'ota',
  '여행사명',
  '여행사',
  '사이트',
  'id',
  '아이디',
  'pw',
  'password',
  '비밀번호',
  '비번',
  '플랫폼',
  'name',
  'login',
  '기타',
  'url',
  '메모',
  '비고',
]);

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

function appendExtra(target: string, addition: string): string {
  const next = addition.trim();
  if (!next) return target;
  return target ? `${target}\n${next}` : next;
}

function looksLikeExtraInSiteColumn(site: string): boolean {
  const trimmed = site.trim();
  if (/^(ID|PW)\s*:/i.test(trimmed)) return true;
  if (/^카드\s*(ID|PW)\s*:/i.test(trimmed)) return true;
  if (/^메일\s*인증\s*:/i.test(trimmed)) return true;
  return false;
}

function looksLikeCutoffToken(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return (
    /^\d{1,2}\s*(AM|PM)$/i.test(trimmed) ||
    /^\d{1,2}:\d{2}\s*(AM|PM)?$/i.test(trimmed) ||
    trimmed === '설정완료'
  );
}

function looksLikeSpilledMetadataRow(site: string, loginId: string, password: string): boolean {
  if (password) return false;
  const trimmed = site.trim();
  if (!trimmed) return false;

  const loginTrimmed = loginId.trim();
  const credentialsMissing = !loginTrimmed || looksLikeCutoffToken(loginTrimmed);
  if (!credentialsMissing) return false;

  if (looksLikeExtraInSiteColumn(trimmed)) return true;
  if (/^한국\s*:/i.test(trimmed)) return true;
  if (/https?:\/\//i.test(trimmed)) return true;
  if (trimmed.includes(',') && trimmed.length > 32) return true;
  if (looksLikeCutoffToken(loginTrimmed) && trimmed.length > 0) return true;
  return false;
}

function isHeaderLabelRow(site: string, loginId: string, password: string): boolean {
  const siteNorm = normalizeHeader(site);
  const loginNorm = normalizeHeader(loginId);
  const passwordNorm = normalizeHeader(password);
  return (
    HEADER_LABELS.has(siteNorm) &&
    (HEADER_LABELS.has(loginNorm) || loginNorm === 'id') &&
    (HEADER_LABELS.has(passwordNorm) || passwordNorm === 'pw')
  );
}

function isMergedContinuationRow(
  site: string,
  loginId: string,
  password: string,
  extra: string,
  url: string,
): boolean {
  if (looksLikeExtraInSiteColumn(site)) return true;
  if (looksLikeSpilledMetadataRow(site, loginId, password)) return true;
  if (!site.trim() && (loginId || password || extra || url)) return true;
  return false;
}

function mergeContinuationRow(
  account: OtaAccount,
  site: string,
  loginId: string,
  password: string,
  extra: string,
  url: string,
): void {
  if (looksLikeExtraInSiteColumn(site) || looksLikeSpilledMetadataRow(site, loginId, password)) {
    const spilled = [site, looksLikeCutoffToken(loginId) ? loginId : ''].filter(Boolean).join(', ');
    account.extra = appendExtra(account.extra, spilled);
  } else if (loginId) {
    if (!account.loginId) account.loginId = loginId;
    else account.extra = appendExtra(account.extra, `ID: ${loginId}`);
  }
  if (password) {
    if (!account.password) account.password = password;
    else account.extra = appendExtra(account.extra, `PW: ${password}`);
  }
  if (extra) account.extra = appendExtra(account.extra, extra);
  if (url) {
    if (!account.url) account.url = url;
    else account.extra = appendExtra(account.extra, url);
  }
}

function scoreHeaderRow(headers: string[], mapping?: OtaAccountColumnMapping): number {
  const siteIndex = mapping?.site
    ? findColumnIndex(headers, [mapping.site])
    : findColumnIndex(headers, SITE_HEADERS);
  const loginIndex = mapping?.login
    ? findColumnIndex(headers, [mapping.login])
    : findColumnIndex(headers, LOGIN_HEADERS);
  const passwordIndex = mapping?.password
    ? findColumnIndex(headers, [mapping.password])
    : findColumnIndex(headers, PASSWORD_HEADERS);

  let score = 0;
  if (siteIndex >= 0) score += 1;
  if (loginIndex >= 0) score += 1;
  if (passwordIndex >= 0) score += 1;
  return score;
}

function findHeaderRowIndex(rows: string[][], mapping?: OtaAccountColumnMapping): number {
  const limit = Math.min(rows.length, 12);
  let bestIndex = 0;
  let bestScore = 0;

  for (let i = 0; i < limit; i += 1) {
    const headers = rows[i].map((cell) => String(cell ?? '').trim());
    const score = scoreHeaderRow(headers, mapping);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestScore >= 2 ? bestIndex : 0;
}

function resolveColumnIndexes(
  headers: string[],
  mapping?: OtaAccountColumnMapping,
): {
  siteIndex: number;
  loginIndex: number;
  passwordIndex: number;
  extraIndex: number;
  urlIndex: number;
} {
  return {
    siteIndex: mapping?.site
      ? findColumnIndex(headers, [mapping.site])
      : findColumnIndex(headers, SITE_HEADERS),
    loginIndex: mapping?.login
      ? findColumnIndex(headers, [mapping.login])
      : findColumnIndex(headers, LOGIN_HEADERS),
    passwordIndex: mapping?.password
      ? findColumnIndex(headers, [mapping.password])
      : findColumnIndex(headers, PASSWORD_HEADERS),
    extraIndex: mapping?.extra
      ? findColumnIndex(headers, [mapping.extra])
      : findColumnIndex(headers, EXTRA_HEADERS),
    urlIndex: mapping?.url
      ? findColumnIndex(headers, [mapping.url])
      : findColumnIndex(headers, URL_HEADERS),
  };
}

function isDeprecatedSectionStart(site: string): boolean {
  return site.includes('(사용안함)');
}

export function parseOtaAccountRows(
  rows: string[][],
  mapping?: OtaAccountColumnMapping,
): OtaAccount[] {
  if (!rows.length) return [];

  const headerRowIndex = findHeaderRowIndex(rows, mapping);
  const headerRow = rows[headerRowIndex];
  const headers = headerRow.map((cell) => String(cell ?? '').trim());
  const bodyRows = rows.slice(headerRowIndex + 1);

  let { siteIndex, loginIndex, passwordIndex, extraIndex, urlIndex } = resolveColumnIndexes(
    headers,
    mapping,
  );

  const hasHeaderMatch = siteIndex >= 0 || loginIndex >= 0 || passwordIndex >= 0;
  const dataRows = hasHeaderMatch ? bodyRows : rows;

  if (!hasHeaderMatch) {
    siteIndex = 0;
    loginIndex = 1;
    passwordIndex = 2;
    extraIndex = 3;
    urlIndex = 4;
  }

  const accounts: OtaAccount[] = [];

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex += 1) {
    const row = dataRows[rowIndex];
    const site = cellValue(row, siteIndex);
    const loginId = cellValue(row, loginIndex);
    const password = cellValue(row, passwordIndex);
    const extra = cellValue(row, extraIndex);
    const url = cellValue(row, urlIndex);

    if (isDeprecatedSectionStart(site)) break;

    if (!site && !loginId && !password && !extra && !url) continue;
    if (isHeaderLabelRow(site, loginId, password)) continue;

    if (accounts.length > 0 && isMergedContinuationRow(site, loginId, password, extra, url)) {
      mergeContinuationRow(accounts[accounts.length - 1], site, loginId, password, extra, url);
      continue;
    }

    accounts.push({
      id: `${rowIndex}-${site || loginId || 'row'}`,
      site,
      loginId,
      password,
      extra,
      url,
    });
  }

  return accounts;
}

export function parseOtaAccountCsv(text: string, mapping?: OtaAccountColumnMapping): OtaAccount[] {
  const rows = parseCsvText(text).filter((row) => row.some((cell) => cell.trim()));
  return parseOtaAccountRows(rows, mapping);
}

/** RFC 4180-style CSV: quoted fields may contain newlines and commas. */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let current = '';
  let inQuotes = false;
  const content = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(current.trim());
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') {
        i += 1;
      }
      currentRow.push(current.trim());
      if (currentRow.some((cell) => cell.trim())) {
        rows.push(currentRow);
      }
      currentRow = [];
      current = '';
      continue;
    }

    current += char;
  }

  currentRow.push(current.trim());
  if (currentRow.some((cell) => cell.trim())) {
    rows.push(currentRow);
  }

  return rows;
}
