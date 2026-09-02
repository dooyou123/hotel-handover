import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

export type OtaAccountMemoRow = {
  account_key: string;
  memo: string;
  updated_by: string;
  updated_at: string;
};

export async function fetchOtaAccountMemos(): Promise<Record<string, OtaAccountMemoRow>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('ota_account_memos')
    .select('account_key, memo, updated_by, updated_at')
    .eq('hotel_id', DEFAULT_HOTEL_ID);
  if (error) throw error;

  const map: Record<string, OtaAccountMemoRow> = {};
  for (const row of data ?? []) {
    map[row.account_key as string] = row as OtaAccountMemoRow;
  }
  return map;
}

export async function saveOtaAccountMemo(input: {
  accountKey: string;
  memo: string;
  updatedBy: string;
}): Promise<OtaAccountMemoRow> {
  const accountKey = input.accountKey.trim();
  if (!accountKey) throw new Error('계정 정보가 올바르지 않습니다.');

  const supabase = createClient();
  const { data, error } = await supabase
    .from('ota_account_memos')
    .upsert(
      {
        hotel_id: DEFAULT_HOTEL_ID,
        account_key: accountKey,
        memo: input.memo.trim(),
        updated_by: input.updatedBy.trim(),
      },
      { onConflict: 'hotel_id,account_key' },
    )
    .select('account_key, memo, updated_by, updated_at')
    .single();
  if (error) throw error;
  return data as OtaAccountMemoRow;
}
