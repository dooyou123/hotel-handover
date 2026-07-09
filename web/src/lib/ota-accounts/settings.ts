import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import {
  DEFAULT_OTA_ACCOUNT_COLUMNS,
  type OtaAccountColumnMapping,
  type OtaAccountsSheetSettings,
} from '@/lib/ota-accounts/types';
import { isValidGoogleSheetShareUrl } from '@/lib/ota-accounts/sheet-url';
import { createClient } from '@/lib/supabase/client';

type HotelOtaAccountsRow = {
  ota_accounts_sheet_url: string | null;
  ota_accounts_col_site: string | null;
  ota_accounts_col_login: string | null;
  ota_accounts_col_password: string | null;
  ota_accounts_col_extra: string | null;
  ota_accounts_col_url: string | null;
};

function normalizeColumns(
  row: Pick<
    HotelOtaAccountsRow,
    | 'ota_accounts_col_site'
    | 'ota_accounts_col_login'
    | 'ota_accounts_col_password'
    | 'ota_accounts_col_extra'
    | 'ota_accounts_col_url'
  >,
): OtaAccountColumnMapping {
  return {
    site: row.ota_accounts_col_site?.trim() || DEFAULT_OTA_ACCOUNT_COLUMNS.site,
    login: row.ota_accounts_col_login?.trim() || DEFAULT_OTA_ACCOUNT_COLUMNS.login,
    password: row.ota_accounts_col_password?.trim() || DEFAULT_OTA_ACCOUNT_COLUMNS.password,
    extra: row.ota_accounts_col_extra?.trim() || DEFAULT_OTA_ACCOUNT_COLUMNS.extra,
    url: row.ota_accounts_col_url?.trim() || DEFAULT_OTA_ACCOUNT_COLUMNS.url,
  };
}

function rowToSettings(row: HotelOtaAccountsRow | null): OtaAccountsSheetSettings {
  return {
    sheetUrl: row?.ota_accounts_sheet_url?.trim() ?? '',
    columns: normalizeColumns({
      ota_accounts_col_site: row?.ota_accounts_col_site ?? null,
      ota_accounts_col_login: row?.ota_accounts_col_login ?? null,
      ota_accounts_col_password: row?.ota_accounts_col_password ?? null,
      ota_accounts_col_extra: row?.ota_accounts_col_extra ?? null,
      ota_accounts_col_url: row?.ota_accounts_col_url ?? null,
    }),
  };
}

export async function fetchOtaAccountsSheetSettings(
  hotelId = DEFAULT_HOTEL_ID,
): Promise<OtaAccountsSheetSettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('hotels')
    .select(
      'ota_accounts_sheet_url, ota_accounts_col_site, ota_accounts_col_login, ota_accounts_col_password, ota_accounts_col_extra, ota_accounts_col_url',
    )
    .eq('id', hotelId)
    .maybeSingle();
  if (error) throw error;
  return rowToSettings(data);
}

export async function saveOtaAccountsSheetSettings(
  input: OtaAccountsSheetSettings,
  hotelId = DEFAULT_HOTEL_ID,
): Promise<OtaAccountsSheetSettings> {
  const sheetUrl = input.sheetUrl.trim();
  const columns = {
    site: input.columns.site.trim() || DEFAULT_OTA_ACCOUNT_COLUMNS.site,
    login: input.columns.login.trim() || DEFAULT_OTA_ACCOUNT_COLUMNS.login,
    password: input.columns.password.trim() || DEFAULT_OTA_ACCOUNT_COLUMNS.password,
    extra: input.columns.extra.trim() || DEFAULT_OTA_ACCOUNT_COLUMNS.extra,
    url: input.columns.url.trim() || DEFAULT_OTA_ACCOUNT_COLUMNS.url,
  };

  if (sheetUrl && !isValidGoogleSheetShareUrl(sheetUrl)) {
    throw new Error('구글 시트 공유 링크 형식이 올바르지 않습니다.');
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('hotels')
    .update({
      ota_accounts_sheet_url: sheetUrl,
      ota_accounts_col_site: columns.site,
      ota_accounts_col_login: columns.login,
      ota_accounts_col_password: columns.password,
      ota_accounts_col_extra: columns.extra,
      ota_accounts_col_url: columns.url,
    })
    .eq('id', hotelId)
    .select(
      'ota_accounts_sheet_url, ota_accounts_col_site, ota_accounts_col_login, ota_accounts_col_password, ota_accounts_col_extra, ota_accounts_col_url',
    )
    .single();
  if (error) throw error;
  return rowToSettings(data);
}

/** @deprecated fetchOtaAccountsSheetSettings 사용 */
export async function fetchOtaAccountsSheetUrl(hotelId = DEFAULT_HOTEL_ID): Promise<string> {
  const settings = await fetchOtaAccountsSheetSettings(hotelId);
  return settings.sheetUrl;
}

/** @deprecated saveOtaAccountsSheetSettings 사용 */
export async function saveOtaAccountsSheetUrl(
  sheetUrl: string,
  hotelId = DEFAULT_HOTEL_ID,
): Promise<string> {
  const settings = await saveOtaAccountsSheetSettings(
    {
      sheetUrl,
      columns: DEFAULT_OTA_ACCOUNT_COLUMNS,
    },
    hotelId,
  );
  return settings.sheetUrl;
}
