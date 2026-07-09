export type ParsedGoogleSheetUrl = {
  spreadsheetId: string;
  gid: string;
};

export function parseGoogleSheetShareUrl(input: string): ParsedGoogleSheetUrl | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return { spreadsheetId: trimmed, gid: '0' };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (!url.hostname.includes('docs.google.com')) return null;

  const match = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match?.[1]) return null;

  const gidFromHash = url.hash.match(/gid=(\d+)/)?.[1];
  const gidFromQuery = url.searchParams.get('gid');
  const gid = gidFromHash || gidFromQuery || '0';

  return { spreadsheetId: match[1], gid };
}

export function googleSheetShareUrlToCsvExportUrl(input: string): string {
  const parsed = parseGoogleSheetShareUrl(input);
  if (!parsed) {
    throw new Error('구글 시트 공유 링크 형식이 올바르지 않습니다.');
  }

  const params = new URLSearchParams({
    format: 'csv',
    gid: parsed.gid,
  });

  return `https://docs.google.com/spreadsheets/d/${parsed.spreadsheetId}/export?${params.toString()}`;
}

export function isValidGoogleSheetShareUrl(input: string): boolean {
  return parseGoogleSheetShareUrl(input) !== null;
}
