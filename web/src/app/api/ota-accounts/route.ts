import { NextResponse, type NextRequest } from 'next/server';
import { fetchOtaAccounts } from '@/lib/ota-accounts/fetch-ota-accounts';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import {
  DEFAULT_OTA_ACCOUNT_COLUMNS,
  type OtaAccountColumnMapping,
} from '@/lib/ota-accounts/types';
import { createClient } from '@/lib/supabase/server';

function readColumns(row: {
  ota_accounts_col_site: string | null;
  ota_accounts_col_login: string | null;
  ota_accounts_col_password: string | null;
}): OtaAccountColumnMapping {
  return {
    site: row.ota_accounts_col_site?.trim() || DEFAULT_OTA_ACCOUNT_COLUMNS.site,
    login: row.ota_accounts_col_login?.trim() || DEFAULT_OTA_ACCOUNT_COLUMNS.login,
    password: row.ota_accounts_col_password?.trim() || DEFAULT_OTA_ACCOUNT_COLUMNS.password,
  };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const force = request.nextUrl.searchParams.get('refresh') === '1';

  const { data: hotel, error: hotelError } = await supabase
    .from('hotels')
    .select(
      'ota_accounts_sheet_url, ota_accounts_col_site, ota_accounts_col_login, ota_accounts_col_password',
    )
    .eq('id', DEFAULT_HOTEL_ID)
    .maybeSingle();

  if (hotelError) {
    return NextResponse.json({ error: hotelError.message }, { status: 500 });
  }

  const sheetUrl = hotel?.ota_accounts_sheet_url?.trim() ?? '';
  const columns = readColumns({
    ota_accounts_col_site: hotel?.ota_accounts_col_site ?? null,
    ota_accounts_col_login: hotel?.ota_accounts_col_login ?? null,
    ota_accounts_col_password: hotel?.ota_accounts_col_password ?? null,
  });

  try {
    const payload = await fetchOtaAccounts(sheetUrl, columns, force);
    return NextResponse.json({ ...payload, sheetUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OTA 계정을 불러오지 못했습니다.';
    const status = message.includes('설정') ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
