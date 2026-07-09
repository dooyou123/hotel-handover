import { parseOtaAccountCsv } from '@/lib/ota-accounts/parse';
import { googleSheetShareUrlToCsvExportUrl } from '@/lib/ota-accounts/sheet-url';
import type { OtaAccountColumnMapping, OtaAccountsPayload } from '@/lib/ota-accounts/types';

const CACHE_TTL_MS = 5 * 60_000;

type CacheEntry = {
  key: string;
  payload: OtaAccountsPayload;
  at: number;
};

let cache: CacheEntry | null = null;

function cacheKey(sheetUrl: string, columns: OtaAccountColumnMapping): string {
  return JSON.stringify({ sheetUrl: sheetUrl.trim(), columns });
}

async function fetchCsvText(csvUrl: string): Promise<string> {
  const response = await fetch(csvUrl, {
    cache: 'no-store',
    headers: {
      'User-Agent': 'hotel-handover/1.0',
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        '시트를 불러올 수 없습니다. 구글 시트가 「링크가 있는 모든 사용자 · 뷰어」로 공유되어 있는지 확인해 주세요.',
      );
    }
    throw new Error(`시트 CSV를 불러오지 못했습니다. (${response.status})`);
  }

  const text = await response.text();
  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    throw new Error(
      '시트 데이터 대신 HTML이 반환되었습니다. 공유 링크가 올바른지, 뷰어 권한으로 열려 있는지 확인해 주세요.',
    );
  }

  return text;
}

export function otaAccountsSheetUrlHint(): string {
  return '설정 → 메뉴 탭에서 OTA 계정 구글 시트 공유 링크를 등록해 주세요.';
}

export async function fetchOtaAccounts(
  sheetUrl: string,
  columns: OtaAccountColumnMapping,
  force = false,
): Promise<OtaAccountsPayload> {
  const key = cacheKey(sheetUrl, columns);
  if (!sheetUrl.trim()) {
    throw new Error(otaAccountsSheetUrlHint());
  }

  if (!force && cache && cache.key === key && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.payload;
  }

  const csvUrl = googleSheetShareUrlToCsvExportUrl(sheetUrl);
  const csv = await fetchCsvText(csvUrl);
  const accounts = parseOtaAccountCsv(csv, columns);

  const payload: OtaAccountsPayload = {
    accounts,
    fetchedAt: new Date().toISOString(),
    source: 'sheet_csv',
    columns,
    sheetUrl: key,
  };

  cache = { key, payload, at: Date.now() };
  return payload;
}

export function clearOtaAccountsCache(): void {
  cache = null;
}
